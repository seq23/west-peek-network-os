import { requireAuthenticatedUser, type AuthEnv } from '../../../_shared/auth';
import { json, readJson } from '../../../_shared/json';
import { appendRecord, sheetsUnavailable, type RuntimeEnv } from '../../../_shared/sheets';

type Env = RuntimeEnv & AuthEnv;
type Context = { request: Request; env: Env };

type Body = {
  touch_id?: string;
  contact_id?: string;
  contact_email?: string;
  recipient_name?: string;
  recipient_email?: string;
  company?: string;
  owner?: string;
  reason?: string;
  priority?: string;
  due_date?: string;
  status?: string;
  method?: string;
  card_type?: string;
  card_title?: string;
  draft_message?: string;
  email_subject?: string;
  email_body?: string;
  approval_required?: string | boolean;
  fulfillment_mode?: 'vendor' | 'self';
  fulfillment_status?: string;
  vendor_name?: string;
  vendor_url?: string;
  vendor_fit?: string;
  vendor_note?: string;
  external_order_id?: string;
  fulfillment_notes?: string;
  sent_at?: string;
  created_by?: string;
  updated_by?: string;
};

const MAX_NOTE_CHARS = 3000;

export async function onRequestPost({ request, env }: Context) {
  let user: { email: string };
  try {
    user = await requireAuthenticatedUser(request, env);
  } catch (error) {
    return json({ ok: false, error: error instanceof Error ? error.message : 'Authentication required.', execution_allowed: false }, { status: 401 });
  }

  const body = await readJson<Body>(request);
  const touchId = clean(body.touch_id);
  if (!touchId) return json({ ok: false, error: 'touch_id is required.', execution_allowed: false }, { status: 400 });
  const mode = body.fulfillment_mode === 'self' ? 'self' : 'vendor';
  const status = normalizeStatus(body.status, body.fulfillment_status, mode);
  const notes = clean(body.fulfillment_notes).slice(0, MAX_NOTE_CHARS);
  const now = new Date().toISOString();

  const trace = [
    { stage: 'auth', status: 'passed', detail: `authenticated operator ${user.email}` },
    { stage: 'fulfillment_mode', status: 'passed', detail: mode === 'self' ? 'operator chose I will do it myself' : `operator chose vendor handoff: ${clean(body.vendor_name) || 'vendor not named'}` },
    { stage: 'execution_guardrail', status: 'passed', detail: 'Network OS did not place an order, pay a vendor, mail a card, or send email automatically' }
  ];

  const touch = {
    touch_id: touchId,
    created_at: clean(body.sent_at) || now,
    updated_at: now,
    contact_id: clean(body.contact_id),
    contact_email: clean(body.contact_email || body.recipient_email),
    recipient_name: clean(body.recipient_name),
    recipient_email: clean(body.recipient_email || body.contact_email),
    company: clean(body.company),
    owner: clean(body.owner) || 'Unassigned',
    reason: clean(body.reason) || 'Relationship touch',
    priority: clean(body.priority) || 'Normal',
    due_date: clean(body.due_date) || 'This week',
    status,
    method: clean(body.method) || 'handwritten_note',
    card_type: clean(body.card_type) || (clean(body.method).includes('virtual') ? 'west_peek_virtual' : 'handwritten_note'),
    card_title: clean(body.card_title),
    draft_message: clean(body.draft_message),
    email_subject: clean(body.email_subject),
    email_body: clean(body.email_body),
    approval_required: 'true',
    execution_allowed: 'false',
    internal_data_trace: JSON.stringify(trace),
    created_by: clean(body.created_by) || user.email,
    updated_by: user.email,
    fulfillment_mode: mode,
    fulfillment_status: clean(body.fulfillment_status) || status,
    vendor_name: mode === 'self' ? "I'll do it myself" : clean(body.vendor_name),
    vendor_url: mode === 'self' ? '' : clean(body.vendor_url),
    vendor_fit: clean(body.vendor_fit),
    vendor_note: clean(body.vendor_note),
    external_order_id: clean(body.external_order_id),
    sent_at: status === 'sent' || status === 'sent_externally' || status === 'completed' ? (clean(body.sent_at) || now) : '',
    fulfillment_notes: notes
  };

  try {
    await appendRecord(env, 'relationship_touches', touch);
  } catch (error) {
    return sheetsUnavailable(error);
  }

  return json({ ok: true, touch, persistence: 'google_sheets', human_review_required: true, execution_allowed: false, execution_status: 'not_executed_by_app', internal_data_trace: trace });
}

function clean(value: unknown) {
  return String(value || '').trim();
}

function normalizeStatus(statusInput: unknown, fulfillmentStatusInput: unknown, mode: 'vendor' | 'self') {
  const text = clean(statusInput || fulfillmentStatusInput).toLowerCase();
  if (['sent', 'sent_externally', 'completed', 'cancelled', 'failed', 'approved', 'opened_vendor', 'will_do_myself'].includes(text)) return text;
  return mode === 'self' ? 'will_do_myself' : 'opened_vendor';
}
