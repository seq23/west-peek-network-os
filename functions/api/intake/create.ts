import { requireAuthenticatedUser, type AuthEnv } from '../../_shared/auth';
import { json, readJson } from '../../_shared/json';
import { containsTrigger, inferNeedsTouch, normalizeOwner, normalizePriority, normalizeTouch, parseFields } from '../../_shared/triggers';
import { appendRecord, sheetsUnavailable, type RuntimeEnv } from '../../_shared/sheets';

type Context = { request: Request; env: RuntimeEnv & AuthEnv };

type Body = {
  raw_text?: string;
  captured_by?: string;
  source_user_email?: string;
  email_subject?: string;
  email_from?: string;
  email_to?: string;
  email_date?: string;
  gmail_message_id?: string;
  gmail_thread_id?: string;
};

export async function onRequestPost({ request, env }: Context) {
  let user: { email: string };
  try {
    user = await requireAuthenticatedUser(request, env);
  } catch (error) {
    return json({ ok: false, error: error instanceof Error ? error.message : 'Authentication required.' }, { status: 401 });
  }
  const body = await readJson<Body>(request);
  const rawText = String(body.raw_text || '').slice(0, 6000);
  if (!containsTrigger(rawText)) return json({ ok: false, error: 'No accepted West Peek Network trigger found.' }, { status: 422 });
  const fields = parseFields(rawText);
  const inferred = inferFromEmailEnvelope(body);
  const now = new Date().toISOString();
  const parsedName = fields.name || inferred.name || '';
  const parsedEmail = fields.email || inferred.email || '';
  const parsedNotes = fields.context || fields.notes || fields.raw_unstructured_context || stripTrigger(rawText) || 'Minimal #wpnetwork capture. Review email thread for context.';
  const parsedOwner = normalizeOwner(fields.owner) || inferOwnerFromText(rawText) || inferOwnerFromEmail(user.email);
  const parsedTouch = normalizeTouch(fields.touch) || inferTouchFromText(rawText);
  const parsedPriority = normalizePriority(fields.priority) || inferPriorityFromText(rawText);
  const parsedDue = fields.due || inferDueFromText(rawText);
  const needsTouch = inferNeedsTouch(rawText, fields.needs_touch, parsedTouch);
  const intake = {
    intake_id: `intake_${Date.now()}_${crypto.randomUUID().slice(0, 8)}`,
    created_at: now,
    updated_at: now,
    source: 'gmail_trigger',
    capture_type: 'email_thread',
    captured_by: body.captured_by || body.source_user_email || user.email,
    source_user_email: body.source_user_email || body.captured_by || user.email,
    source_file_name: '',
    source_file_type: '',
    gmail_message_id: body.gmail_message_id || '',
    gmail_thread_id: body.gmail_thread_id || '',
    raw_text: rawText,
    email_subject: body.email_subject || '',
    email_from: body.email_from || '',
    email_to: body.email_to || '',
    email_date: body.email_date || '',
    parsed_name: parsedName,
    parsed_email: parsedEmail,
    parsed_phone: fields.phone || '',
    parsed_company: fields.company || '',
    parsed_title: fields.title || '',
    parsed_website: fields.website || '',
    parsed_notes: parsedNotes,
    parsed_owner: parsedOwner,
    parsed_touch: parsedTouch,
    parsed_priority: parsedPriority,
    parsed_due: parsedDue,
    parsed_needs_touch: needsTouch ? 'true' : 'false',
    extracted_text: '',
    transcript_text: '',
    missing_fields: missingFields(parsedName, parsedEmail, fields.company).join(', '),
    ai_summary: parsedNotes,
    ai_confidence: parsedName || parsedEmail || parsedNotes ? 'medium' : 'low',
    internal_data_trace: JSON.stringify([
      { stage: 'trigger_detected', status: 'passed', detail: 'accepted West Peek trigger found' },
      { stage: 'partial_capture', status: 'passed', detail: 'minimal, freeform, and structured captures are allowed; missing fields go to human review' },
      { stage: 'execution_guardrail', status: 'passed', detail: 'no contact added automatically' }
    ]),
    human_review_required: 'true',
    execution_allowed: 'false',
    review_status: 'pending_human_review'
  };
  try {
    await appendRecord(env, 'intake_queue', intake);
  } catch (error) {
    return sheetsUnavailable(error);
  }
  return json({ ok: true, intake, persistence: 'google_sheets', human_review_required: true, execution_allowed: false, execution_status: 'not_executed' });
}

function inferFromEmailEnvelope(body: Body) {
  const captured = (body.source_user_email || body.captured_by || '').toLowerCase();
  const candidates = [body.email_from, body.email_to].filter(Boolean).map((value) => parseMailbox(value || '')).filter(Boolean) as Array<{ name: string; email: string }>;
  const external = candidates.find((candidate) => candidate.email && candidate.email.toLowerCase() !== captured);
  return external || candidates[0] || { name: '', email: '' };
}

function parseMailbox(value: string) {
  const angle = value.match(/([^<]*)<([^>]+)>/);
  if (angle) return { name: angle[1].trim().replace(/^"|"$/g, ''), email: angle[2].trim() };
  const email = value.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i)?.[0] || '';
  return email ? { name: value.replace(email, '').replace(/[<>"']/g, '').trim(), email } : undefined;
}


function inferOwnerFromText(text: string) {
  const lower = text.toLowerCase();
  if (lower.includes('scooter')) return 'Scooter';
  if (lower.includes('sequoia')) return 'Sequoia';
  return '';
}

function inferOwnerFromEmail(email: string) {
  const lower = email.toLowerCase();
  if (lower.includes('scooter')) return 'Scooter';
  if (lower.includes('sequoia')) return 'Sequoia';
  return 'Unassigned';
}

function inferTouchFromText(text: string) {
  const lower = text.toLowerCase();
  if (lower.includes('handwritten') || lower.includes('hand written')) return 'handwritten_note';
  if (lower.includes('thank') && lower.includes('card')) return 'virtual_thank_you_card';
  if (lower.includes('gift')) return 'gift';
  if (lower.includes('intro')) return 'intro';
  if (lower.includes('call')) return 'call';
  if (lower.includes('meeting')) return 'meeting';
  if (lower.includes('email') || lower.includes('follow')) return 'email';
  return 'undecided';
}

function inferPriorityFromText(text: string) {
  if (/high|urgent|this week|valuable|important/i.test(text)) return 'High';
  if (/low/i.test(text)) return 'Low';
  return 'Normal';
}

function inferDueFromText(text: string) {
  const match = text.match(/\b(today|tomorrow|this week|next week|this month|next month)\b/i);
  return match?.[1] || '';
}

function stripTrigger(text: string) {
  return text.replace(/#wpnetwork|#addtowestpeek|#westpeeknetwork/gi, '').trim();
}

function missingFields(name: string, email: string, company: string | undefined) {
  const missing: string[] = [];
  if (!name) missing.push('name');
  if (!email) missing.push('email');
  if (!company) missing.push('company');
  return missing;
}
