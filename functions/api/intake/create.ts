import { json, readJson } from '../../_shared/json';
import { containsTrigger, parseFields } from '../../_shared/triggers';
import { appendRecord, sheetsUnavailable, type RuntimeEnv } from '../../_shared/sheets';

type Context = { request: Request; env: RuntimeEnv };

export async function onRequestPost({ request, env }: Context) {
  const body = await readJson<{ raw_text?: string; captured_by?: string }>(request);
  const rawText = body.raw_text || '';
  if (!containsTrigger(rawText)) return json({ ok: false, error: 'No accepted West Peek Network trigger found.' }, { status: 422 });
  const fields = parseFields(rawText);
  const now = new Date().toISOString();
  const intake = {
    intake_id: `intake_${Date.now()}_${crypto.randomUUID().slice(0, 8)}`,
    created_at: now,
    updated_at: now,
    source: 'gmail_trigger',
    captured_by: body.captured_by || 'unknown',
    source_user_email: body.captured_by || 'unknown',
    raw_text: rawText,
    parsed_name: fields.name || '',
    parsed_company: fields.company || '',
    parsed_notes: fields.context || fields.notes || '',
    ai_summary: fields.context || fields.notes || 'Captured for West Peek Network review.',
    ai_confidence: fields.name || fields.context ? 'medium' : 'low',
    review_status: 'ai_reviewed'
  };
  try {
    await appendRecord(env, 'intake_queue', intake);
  } catch (error) {
    return sheetsUnavailable(error);
  }
  return json({ ok: true, intake, persistence: 'google_sheets' });
}
