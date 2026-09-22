/**
 * POST /api/intake/site-form — the sheet door for every West Peek website form.
 *
 * Sibling of `pitch-lab.ts`. Called server-to-server by
 * `functions/api/lead.js` in join-west-peek-main, once per submission, after
 * that handler has validated the fields and cleared the honeypot. See
 * `functions/_shared/siteFormIntake.ts` for why this one writes `contacts`
 * directly where Pitch Lab writes `intake_queue`.
 *
 * Idempotency: `submission_id` is hashed into `provider_replay_guard` under
 * provider `site_form` before the contacts write. A retry of the same
 * submission finds its own guard row and returns the contact it already made,
 * so a network retry on the sites' side cannot produce a second row.
 */

import { json } from '../../_shared/json';
import { appendRecord, readTab, readTabPhysicalRows, sheetsUnavailable } from '../../_shared/sheets';
import {
  PROOF_RUN_ID_PATTERN,
  SITE_FORM_PROVIDER,
  SITE_FORM_SUBMISSION_ID_HEADER,
  checkSiteFormSecret,
  findExistingContact,
  readProofContext,
  submissionHash,
  text,
  upsertSiteFormContact,
  validateSiteFormPayload,
  type SiteFormIntakeEnv
} from '../../_shared/siteFormIntake';

export async function onRequestPost({ request, env }: { request: Request; env: SiteFormIntakeEnv }) {
  const gate = checkSiteFormSecret(request.headers, env);
  if (!gate.ok) return json({ ok: false, error_code: gate.error_code, message: gate.message }, { status: gate.status });

  const bodyText = await request.text();
  let payload: Record<string, unknown>;
  try {
    payload = JSON.parse(bodyText) as Record<string, unknown>;
  } catch {
    return json({ ok: false, error_code: 'INVALID_JSON', message: 'Request body must be valid JSON.' }, { status: 400 });
  }

  if (!text(payload.submission_id)) {
    const headerId = text(request.headers.get(SITE_FORM_SUBMISSION_ID_HEADER));
    if (headerId) payload.submission_id = headerId;
  }

  const validation = validateSiteFormPayload(payload);
  if (!validation.ok) return json({ ok: false, error_code: 'VALIDATION_FAILED', errors: validation.errors }, { status: 400 });

  // A proof submission must be removable by the existing cleanup path or it is
  // litter in the fund's real relationship database. Refuse it, do not write it.
  const proof = readProofContext(request.headers);
  if (proof.isProof && (!PROOF_RUN_ID_PATTERN.test(proof.runId) || !proof.testId)) {
    return json({
      ok: false,
      error_code: 'PROOF_FIXTURE_NOT_CLEANABLE',
      message: 'A proof submission needs an admitted x-west-peek-proof-run-id and a non-empty x-west-peek-proof-test-id, or the cleanup path cannot select the row again.'
    }, { status: 400 });
  }

  const submissionId = text(payload.submission_id);
  const email = text(payload.email).toLowerCase();

  try {
    const guardHash = await submissionHash(submissionId);
    const guardRows = await readTab(env, 'provider_replay_guard');
    const alreadySeen = guardRows.some((row) => String(row.provider) === SITE_FORM_PROVIDER && String(row.signature_hash) === guardHash);

    if (alreadySeen) {
      const rows = await readTabPhysicalRows(env, 'contacts');
      const existing = findExistingContact(rows, email, proof);
      return json({
        ok: true,
        contact_id: existing ? String(existing.record.contact_id || '') : '',
        result: 'duplicate_ignored',
        submission_id: submissionId
      });
    }

    await appendRecord(env, 'provider_replay_guard', {
      replay_id: `replay_siteform_${Date.now()}_${crypto.randomUUID().slice(0, 8)}`,
      created_at: new Date().toISOString(),
      provider: SITE_FORM_PROVIDER,
      signature_hash: guardHash,
      submitted_at: new Date().toISOString(),
      source_ip: request.headers.get('cf-connecting-ip') || '',
      status: 'accepted',
      proof_run_id: proof.isProof ? proof.runId : '',
      proof_test_id: proof.isProof ? proof.testId : '',
      proof_fixture: proof.isProof ? 'true' : '',
      proof_status: proof.isProof ? 'active' : '',
      proof_created_at: proof.isProof ? new Date().toISOString() : ''
    });

    const written = await upsertSiteFormContact(env, payload, proof);
    return json({
      ok: true,
      contact_id: written.contact_id,
      result: written.result,
      submission_id: submissionId,
      proof_fixture: proof.isProof
    });
  } catch (error) {
    return sheetsUnavailable(error);
  }
}

export async function onRequest() {
  return json({ ok: false, error_code: 'METHOD_NOT_ALLOWED', message: 'Use POST.' }, { status: 405 });
}
