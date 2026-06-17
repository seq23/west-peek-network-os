import { json } from '../../_shared/json';
import { appendRecord, sheetsUnavailable } from '../../_shared/sheets';
import { buildPitchLabProfileLeadIntake, requirePitchLabSignature, validatePitchLabProfileLeadPayload } from '../../_shared/pitchLabIntake';

export async function onRequestPost({ request, env }: { request: Request; env: Record<string, string> }) {
  const bodyText = await request.text();
  const signature = await requirePitchLabSignature(request, env, bodyText);
  if (!signature.ok) return signature.response;
  let payload: Record<string, unknown>;
  try { payload = JSON.parse(bodyText) as Record<string, unknown>; } catch { return json({ ok: false, error_code: 'INVALID_JSON', message: 'Request body must be valid JSON.' }, { status: 400 }); }
  const validation = validatePitchLabProfileLeadPayload(payload);
  if (!validation.ok) return json({ ok: false, error_code: 'VALIDATION_FAILED', errors: validation.errors }, { status: 400 });
  try {
    const intake = buildPitchLabProfileLeadIntake(payload);
    await appendRecord(env, 'intake_queue', intake);
    return json({ ok: true, intake_id: intake.intake_id, profile_id: '', review_status: 'pending_network_review', database_write_status: 'queued_for_network_review', profile_created: false, contact_created: false, human_review_required: true, execution_allowed: false });
  } catch (error) {
    return sheetsUnavailable(error);
  }
}

export async function onRequest() { return json({ ok: false, error_code: 'METHOD_NOT_ALLOWED', message: 'Use POST.' }, { status: 405 }); }
