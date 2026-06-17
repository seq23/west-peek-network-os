import { requireAuthenticatedUser, type AuthEnv } from '../../_shared/auth';
import { json, readJson } from '../../_shared/json';
import { appendRecord, readTab, sheetsUnavailable, type RuntimeEnv } from '../../_shared/sheets';
import { normalizeIntakeTouch, shouldCreateTouchFromIntake } from '../../_shared/intakeConversion';

type Env = RuntimeEnv & AuthEnv;
type Context = { request: Request; env: Env };
type Body = {
  intake_id?: string;
  action?: 'convert' | 'attach' | 'dismiss';
  attached_contact_id?: string;
  dismiss_reason?: string;
  deal_flow_prospect?: 'yes' | 'no' | 'unknown';
  relationship_owner?: 'Sequoia' | 'Scooter' | 'Unassigned';
};

export async function onRequestPost({ request, env }: Context) {
  try {
    const user = await requireAuthenticatedUser(request, env);
    const body = await readJson<Body>(request);
    if (!body.intake_id || !body.action) return json({ ok: false, error: 'intake_id and action are required.' }, { status: 400 });
    if (!['convert', 'attach', 'dismiss'].includes(body.action)) return json({ ok: false, error: 'action must be convert, attach, or dismiss.' }, { status: 400 });
    if (body.deal_flow_prospect && !['yes', 'no', 'unknown'].includes(body.deal_flow_prospect)) return json({ ok: false, error: 'deal_flow_prospect must be yes, no, or unknown.' }, { status: 400 });
    if (body.relationship_owner && !['Sequoia', 'Scooter', 'Unassigned'].includes(body.relationship_owner)) return json({ ok: false, error: 'relationship_owner must be Sequoia, Scooter, or Unassigned.' }, { status: 400 });
    const rows = await readTab(env, 'intake_queue');
    const intake = latestById(rows, 'intake_id').find((row) => String(row.intake_id) === body.intake_id);
    if (!intake) return json({ ok: false, error: 'Intake item not found in Google Sheets.' }, { status: 404 });
    const now = new Date().toISOString();
    let contact: Record<string, unknown> | undefined;
    const selectedDealFlowProspect = normalizeDealFlowProspect(body.deal_flow_prospect) || normalizeDealFlowProspect(intake.deal_flow_prospect) || 'unknown';
    const selectedOwner = body.relationship_owner ? normalizeOwner(body.relationship_owner) : normalizeOwner(intake.parsed_owner || intake.captured_by);
    const reviewedIntake: Record<string, unknown> = {
      ...intake,
      deal_flow_prospect: selectedDealFlowProspect,
      parsed_owner: selectedOwner
    };
    const decisionRow: Record<string, unknown> = {
      ...reviewedIntake,
      updated_at: now,
      reviewed_by: user.email,
      reviewed_at: now,
      review_status: body.action === 'convert' ? 'converted' : body.action === 'attach' ? 'attached' : 'dismissed',
      attached_contact_id: body.action === 'attach' ? String(body.attached_contact_id || '') : String(intake.attached_contact_id || ''),
      dismiss_reason: body.action === 'dismiss' ? String(body.dismiss_reason || 'Dismissed by operator') : String(intake.dismiss_reason || '')
    };

    if (body.action === 'convert') {
      contact = buildContactFromIntake(reviewedIntake, user.email, now);
      const contacts = await readTab(env, 'contacts');
      const duplicate = contacts.find((row) => String(row.email || '').trim().toLowerCase() && String(row.email || '').trim().toLowerCase() === String(contact?.email || '').trim().toLowerCase());
      if (duplicate) return json({ ok: false, error: 'This person may already be in the West Peek Network.', duplicate }, { status: 409 });
      await appendRecord(env, 'contacts', contact);
      decisionRow.converted_contact_id = String(contact.contact_id);
      const touch = buildTouchFromIntake(reviewedIntake, contact, user.email, now);
      if (touch) await appendRecord(env, 'relationship_touches', touch);
    }

    if (body.action === 'attach') {
      const attachedContactId = String(body.attached_contact_id || '').trim();
      if (!attachedContactId) return json({ ok: false, error: 'attached_contact_id is required for attach.' }, { status: 400 });
      const contacts = latestById(await readTab(env, 'contacts'), 'contact_id');
      if (!contacts.some((row) => String(row.contact_id || '') === attachedContactId)) return json({ ok: false, error: 'Attached contact was not found in the West Peek Network.' }, { status: 404 });
    }

    await appendRecord(env, 'intake_queue', decisionRow);
    return json({ ok: true, action: body.action, intake: decisionRow, contact, persistence: 'google_sheets', human_review_required: true, execution_allowed: false });
  } catch (error) {
    const detail = error instanceof Error ? error.message : 'Could not review intake item.';
    if (detail.includes('Google Sheets')) return sheetsUnavailable(error);
    return json({ ok: false, error: detail }, { status: detail.includes('Authentication') ? 401 : 500 });
  }
}

function buildContactFromIntake(intake: Record<string, unknown>, actor: string, now: string) {
  const raw = String(intake.raw_text || '').trim();
  const fullName = String(intake.parsed_name || '').trim() || String(intake.parsed_email || '').trim() || 'Unparsed intake contact';
  return {
    contact_id: `contact_${Date.now()}_${crypto.randomUUID().slice(0, 8)}`,
    created_at: now,
    updated_at: now,
    status: 'active',
    full_name: fullName,
    email: String(intake.parsed_email || '').trim(),
    company: String(intake.parsed_company || '').trim(),
    person_type: normalizePersonType(intake.person_type),
    deal_flow_prospect: normalizeDealFlowProspect(intake.deal_flow_prospect),
    relationship_type: normalizePersonType(intake.person_type) === 'founder' ? 'Founder' : '',
    relationship_owner: normalizeOwner(intake.parsed_owner || intake.captured_by),
    priority: normalizePriority(intake.parsed_priority || intake.suggested_priority || intake.priority),
    tags: buildContactTags(intake),
    context_summary: buildContactContext(intake, raw),
    dealflow_relevance: normalizeDealFlowProspect(intake.deal_flow_prospect) === 'yes' ? String(intake.deal_context || intake.ai_summary || 'Prospective deal flow').trim() : '',
    founder_relevance: normalizePersonType(intake.person_type) === 'founder' ? String(intake.deal_context || intake.ai_summary || 'Founder relationship').trim() : '',
    touch_needed: shouldCreateTouchFromIntake(intake) ? 'true' : 'false',
    touch_status: shouldCreateTouchFromIntake(intake) ? 'needed' : '',
    created_by: actor,
    updated_by: actor
  };
}


function buildTouchFromIntake(intake: Record<string, unknown>, contact: Record<string, unknown>, actor: string, now: string) {
  if (!shouldCreateTouchFromIntake(intake)) return undefined;
  const method = normalizeIntakeTouch(intake.parsed_touch || intake.touch || intake.method);
  const recipientName = String(contact.full_name || intake.parsed_name || '').trim();
  const reason = String(intake.parsed_notes || intake.ai_summary || intake.raw_text || 'Relationship follow-up needed.').trim();
  return {
    touch_id: `touch_${Date.now()}_${crypto.randomUUID().slice(0, 8)}`,
    created_at: now,
    updated_at: now,
    contact_id: String(contact.contact_id || ''),
    contact_email: String(contact.email || intake.parsed_email || '').trim(),
    recipient_name: recipientName,
    recipient_email: String(contact.email || intake.parsed_email || '').trim(),
    company: String(contact.company || intake.parsed_company || '').trim(),
    owner: normalizeOwner(intake.parsed_owner || contact.relationship_owner),
    reason,
    priority: normalizePriority(intake.parsed_priority || intake.priority),
    due_date: String(intake.parsed_due || intake.due || 'This week'),
    status: 'pending_approval',
    method,
    card_type: method === 'handwritten_note' ? 'handwritten' : method === 'virtual_thank_you_card' ? 'west_peek_virtual' : '',
    card_title: method === 'handwritten_note' || method === 'virtual_thank_you_card' ? `Thank you, ${recipientName || 'there'}` : '',
    draft_message: method === 'handwritten_note' || method === 'virtual_thank_you_card' ? `Thank you for your time, help, and support. We appreciate it. — West Peek` : '',
    approval_required: 'true',
    execution_allowed: 'false',
    internal_data_trace: JSON.stringify([
      { stage: 'structured_intake_touch', status: 'passed', detail: 'touch fields from flexible intake created pending relationship touch' },
      { stage: 'execution_guardrail', status: 'passed', detail: 'no touch sent automatically' }
    ]),
    created_by: actor,
    updated_by: actor
  };
}

function normalizeOwner(value: unknown) {
  const text = String(value || '').toLowerCase();
  if (text.includes('sequoia')) return 'Sequoia';
  if (text.includes('scooter')) return 'Scooter';
  return 'Unassigned';
}

function normalizePriority(value: unknown) {
  const text = String(value || '').toLowerCase();
  if (text.includes('high')) return 'High';
  if (text.includes('low')) return 'Low';
  return 'Normal';
}

function latestById(rows: Array<Record<string, unknown>>, idKey: string) {
  const byId = new Map<string, Record<string, unknown>>();
  for (const row of rows) {
    const id = String(row[idKey] || '').trim();
    if (!id) continue;
    const current = byId.get(id);
    if (!current || timestamp(row.updated_at || row.created_at) >= timestamp(current.updated_at || current.created_at)) byId.set(id, row);
  }
  return Array.from(byId.values());
}

function timestamp(value: unknown) {
  const parsed = Date.parse(String(value || ''));
  return Number.isFinite(parsed) ? parsed : 0;
}


function normalizePersonType(value: unknown) {
  const text = String(value || '').toLowerCase();
  if (['investor', 'founder', 'operator', 'lawyer', 'service_provider', 'media', 'general', 'unknown'].includes(text)) return text;
  return '';
}

function normalizeDealFlowProspect(value: unknown) {
  const text = String(value || '').toLowerCase();
  if (['yes', 'no', 'unknown'].includes(text)) return text;
  return '';
}

function buildContactTags(intake: Record<string, unknown>) {
  const tags = new Set<string>();
  for (const tag of String(intake.tags || intake.capture_type || intake.source || 'intake').split(',').map((item) => item.trim()).filter(Boolean)) tags.add(tag);
  if (normalizePersonType(intake.person_type) === 'founder') tags.add('Founder');
  if (normalizeDealFlowProspect(intake.deal_flow_prospect) === 'yes') tags.add('Prospective Deal Flow');
  return Array.from(tags).join(', ');
}

function buildContactContext(intake: Record<string, unknown>, raw: string) {
  const isDealFlow = normalizeDealFlowProspect(intake.deal_flow_prospect) === 'yes';
  return [
    isDealFlow ? 'Founder / prospective deal flow.' : '',
    String(intake.parsed_notes || intake.ai_summary || raw || 'Captured through West Peek intake queue.'),
    intake.deal_context ? `Deal context: ${intake.deal_context}` : ''
  ].filter(Boolean).join(' ');
}
