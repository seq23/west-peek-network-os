import { json } from '../../_shared/json';
import { appendRecord, sheetsUnavailable } from '../../_shared/sheets';
import { buildPendingPitchLabIntake, requirePitchLabSignature, validatePitchLabPayload } from '../../_shared/pitchLabIntake';

export async function onRequestPost({ request, env }: { request: Request; env: Record<string, string> }) {
  const bodyText = await request.text();
  const signature = await requirePitchLabSignature(request, env, bodyText);
  if (!signature.ok) return signature.response;
  let payload: Record<string, unknown>;
  try { payload = JSON.parse(bodyText) as Record<string, unknown>; } catch { return json({ ok: false, error_code: 'INVALID_JSON', message: 'Request body must be valid JSON.' }, { status: 400 }); }
  const validation = validatePitchLabPayload(payload);
  if (!validation.ok) return json({ ok: false, error_code: 'VALIDATION_FAILED', errors: validation.errors }, { status: 400 });
  const intake = buildPendingPitchLabIntake(payload);
  if (String(intake.execution_allowed) !== 'false' || String(intake.human_review_required) !== 'true' || intake.review_status !== 'pending_human_review') {
    return json({ ok: false, error_code: 'HUMAN_REVIEW_GUARD_FAILED' }, { status: 500 });
  }
  try {
    await appendRecord(env, 'intake_queue', intake);
    return json({ ok: true, intake_id: intake.intake_id, review_status: 'pending_human_review', contact_created: false, human_review_required: true, execution_allowed: false, persistence: 'google_sheets' });
  } catch (error) {
    return sheetsUnavailable(error);
  }
}

export async function onRequest() {
  return json({ ok: false, error_code: 'METHOD_NOT_ALLOWED', message: 'Use POST.' }, { status: 405 });
}
