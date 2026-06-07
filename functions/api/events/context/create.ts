import { requireAuthenticatedUser, type AuthEnv } from '../../../_shared/auth';
import { json, readJson } from '../../../_shared/json';
import { appendRecord, readTab, sheetsUnavailable, type RuntimeEnv } from '../../../_shared/sheets';

type Env = RuntimeEnv & AuthEnv;
type Context = { request: Request; env: Env };
type Body = { event_id?: string; public_name?: string; public_email?: string; public_company?: string; public_title?: string; private_context?: string; source_type?: string };

export async function onRequestPost({ request, env }: Context) {
  try {
    const user = await requireAuthenticatedUser(request, env);
    const body = await readJson<Body>(request);
    const eventId = clean(body.event_id);
    if (!eventId) return json({ ok: false, error: 'event_id is required.' }, { status: 400 });
    const events = latestById(await readTab(env, 'events'), 'event_id');
    const event = events.find((row) => String(row.event_id) === eventId);
    if (!event) return json({ ok: false, error: 'Event not found.' }, { status: 404 });
    const now = new Date().toISOString();
    const context = clean(body.private_context).slice(0, 5000);
    if (!clean(body.public_name) && !clean(body.public_email) && !context) return json({ ok: false, error: 'Add a name, email, or private context.' }, { status: 400 });
    const sourceIntakeId = `intake_${Date.now()}_${crypto.randomUUID().slice(0, 8)}`;
    const attendee = {
      event_attendee_id: `event_attendee_${Date.now()}_${crypto.randomUUID().slice(0, 8)}`,
      event_id: String(event.event_id),
      event_name: String(event.event_name),
      event_slug: String(event.event_slug),
      created_at: now,
      updated_at: now,
      public_name: clean(body.public_name),
      public_email: clean(body.public_email),
      public_company: clean(body.public_company),
      public_title: clean(body.public_title),
      public_phone: '',
      public_linkedin: '',
      public_interest: '',
      private_context: context,
      private_voice_transcript: '',
      ai_summary: context || 'Internal event context captured for review.',
      review_status: 'pending_human_review',
      confidence: clean(body.public_name) || clean(body.public_email) ? 'medium' : 'low',
      missing_fields: missingFields(clean(body.public_name), clean(body.public_email), clean(body.public_company)).join(', '),
      source_type: normalizeSource(body.source_type),
      created_by: user.email,
      source_intake_id: sourceIntakeId,
      consent_follow_up: 'false'
    };
    const intake = {
      intake_id: sourceIntakeId,
      created_at: now,
      updated_at: now,
      source: 'event_private_note',
      capture_type: 'event_private_note',
      captured_by: user.email,
      source_user_email: user.email,
      source_file_name: '',
      source_file_type: '',
      gmail_message_id: '',
      gmail_thread_id: '',
      raw_text: context || [attendee.public_name, attendee.public_email, attendee.public_company].filter(Boolean).join(' | '),
      email_subject: '',
      email_from: '',
      email_to: '',
      email_date: '',
      parsed_name: attendee.public_name,
      parsed_email: attendee.public_email,
      parsed_phone: '',
      parsed_company: attendee.public_company,
      parsed_title: attendee.public_title,
      parsed_website: '',
      parsed_notes: context,
      extracted_text: '',
      transcript_text: '',
      missing_fields: attendee.missing_fields,
      ai_summary: attendee.ai_summary,
      ai_confidence: attendee.confidence,
      internal_data_trace: JSON.stringify([{ stage: 'event_private_context', status: 'passed', detail: 'operator-added event context created pending intake' }, { stage: 'execution_guardrail', status: 'passed', detail: 'no contact added automatically' }]),
      human_review_required: 'true',
      execution_allowed: 'false',
      review_status: 'pending_human_review',
      reviewed_by: '',
      reviewed_at: '',
      converted_contact_id: '',
      attached_contact_id: '',
      dismiss_reason: '',
      event_id: attendee.event_id,
      event_name: attendee.event_name,
      event_slug: attendee.event_slug
    };
    await appendRecord(env, 'event_attendees', attendee);
    await appendRecord(env, 'intake_queue', intake);
    return json({ ok: true, attendee, intake, persistence: 'google_sheets', human_review_required: true, execution_allowed: false });
  } catch (error) {
    const detail = error instanceof Error ? error.message : 'Could not add event context.';
    if (detail.includes('Google Sheets')) return sheetsUnavailable(error);
    return json({ ok: false, error: detail }, { status: detail.includes('Authentication') ? 401 : 500 });
  }
}

function clean(value: unknown) { return String(value || '').trim(); }
function normalizeSource(value: unknown) { const source = clean(value); return source || 'event_private_note'; }
function missingFields(name: string, email: string, company: string) { const m:string[]=[]; if(!name)m.push('name'); if(!email)m.push('email'); if(!company)m.push('company'); return m; }
function latestById(rows: Array<Record<string, unknown>>, idKey: string) {
  const byId = new Map<string, Record<string, unknown>>();
  for (const row of rows) { const id = String(row[idKey] || '').trim(); if (!id) continue; const current = byId.get(id); if (!current || timestamp(row.updated_at || row.created_at) >= timestamp(current.updated_at || current.created_at)) byId.set(id, row); }
  return Array.from(byId.values());
}
function timestamp(value: unknown) { const parsed = Date.parse(String(value || '')); return Number.isFinite(parsed) ? parsed : 0; }
