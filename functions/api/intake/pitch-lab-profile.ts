import { json } from '../../_shared/json';
import { appendRecord, sheetsUnavailable } from '../../_shared/sheets';
import { ensureSelfSubmittedNetworkProfile } from '../../_shared/profileStore';
import { buildPitchLabProfileLeadIntake, requirePitchLabSignature, validatePitchLabProfileLeadPayload } from '../../_shared/pitchLabIntake';

export async function onRequestPost({ request, env }: { request: Request; env: Record<string, string> }) {
  const bodyText = await request.text();
  const signature = await requirePitchLabSignature(request, env, bodyText);
  if (!signature.ok) return signature.response;
  let payload: Record<string, unknown>;
  try { payload = JSON.parse(bodyText) as Record<string, unknown>; } catch { return json({ ok: false, error_code: 'INVALID_JSON', message: 'Request body must be valid JSON.' }, { status: 400 }); }
  const validation = validatePitchLabProfileLeadPayload(payload);
  if (!validation.ok) return json({ ok: false, error_code: 'VALIDATION_FAILED', errors: validation.errors }, { status: 400 });
  const founder = payload.founder as Record<string, unknown>;
  try {
    const profile = await ensureSelfSubmittedNetworkProfile(env, { name: founder.name, email: founder.email, company: founder.company_name, website: founder.website, personType: 'founder', source: 'pitch_lab', captureType: 'founder_profile_lead', contextSummary: 'Pitch Lab founder profile lead.' });
    const intake = buildPitchLabProfileLeadIntake(payload, profile);
    await appendRecord(env, 'intake_queue', intake);
    return json({ ok: true, intake_id: intake.intake_id, profile_id: profile.profile_id, review_status: 'lead_captured', database_write_status: profile.database_write_status, profile_created: profile.profile_created === true, contact_created: false, execution_allowed: false });
  } catch (error) {
    return sheetsUnavailable(error);
  }
}

export async function onRequest() { return json({ ok: false, error_code: 'METHOD_NOT_ALLOWED', message: 'Use POST.' }, { status: 405 }); }
