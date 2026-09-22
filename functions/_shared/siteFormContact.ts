/**
 * Site-form intake, pure half — every decision, no I/O.
 *
 * Split out of `siteFormIntake.ts` so the contract test can import and execute
 * the code that actually ships. A module that reaches the network cannot be
 * loaded in a unit test, and a test that pattern-matches source instead of
 * running it proves only that the letters are still there.
 *
 * THE RULE THIS IMPLEMENTS (Sequoia, 22 Sep 2026): "make all forms automatically
 * default to adding names to our master network sheet." Until now the three
 * static sites' `/api/lead` handler only emailed each submission to Scooter and
 * stored nothing, so the master network sheet never learned about anyone who
 * filled in a form on joinwestpeek.com, westpeek.ventures or
 * westpeekproductions.com. This module is the door that closes that gap.
 *
 * HOW IT DIFFERS FROM PITCH LAB. `pitch-lab.ts` deliberately writes to
 * `intake_queue` and never creates a contact: a founder who practises a pitch
 * has not asked to be in the fund's relationship database, so a human reviews
 * first. A website form is the opposite case — the visitor typed their name and
 * email into West Peek's own front door and pressed submit. The owner's rule is
 * that those people go straight onto the `contacts` tab. So this door writes
 * `contacts` directly, and that divergence is intentional, not an oversight.
 *
 * SHAPE. Modelled on `pitchLabIntake.ts`: a shared secret in a header, an
 * allow-listed origin, and the existing `provider_replay_guard` tab for
 * idempotency. It differs in two ways, both deliberate:
 *
 *  - The secret is compared directly rather than used to sign the body. The
 *    caller is our own Pages Function running server-side on the same account,
 *    over TLS, with the secret injected as a Pages secret; there is no browser
 *    in the path that could leak it, and an HMAC over a body the same process
 *    composed would prove nothing extra. The comparison is still constant-time.
 *  - Idempotency is keyed on a caller-supplied `submission_id` rather than on a
 *    signature, so a retry of the same submission cannot double-write.
 */

/** The env fields this module reads. `sheets.ts` owns the Google half. */
export interface SiteFormEnv {
  WP_NETWORK_OS_INTAKE_SECRET?: string;
  WP_NETWORK_OS_INTAKE_ALLOWED_ORIGINS?: string;
  GOOGLE_SHEET_ID?: string;
  GOOGLE_SERVICE_ACCOUNT_EMAIL?: string;
  GOOGLE_PRIVATE_KEY?: string;
}

export const SITE_FORM_SECRET_HEADER = 'x-wp-network-os-intake-secret';
export const SITE_FORM_SUBMISSION_ID_HEADER = 'x-wp-network-os-submission-id';
export const SITE_FORM_PROVIDER = 'site_form';

/**
 * The West Peek property hosts allowed to post through this door, as ONE
 * constant. `WP_NETWORK_OS_INTAKE_ALLOWED_ORIGINS` may add to it (comma
 * separated, full origins) for a preview deployment; it never replaces it.
 *
 * Origin is a secondary check. A server-to-server fetch from a Pages Function
 * sends no Origin header at all, which is why an absent Origin is allowed and
 * the shared secret is the real gate — exactly as pitch-lab.ts treats it.
 */
export const SITE_FORM_ALLOWED_HOSTS = [
  'joinwestpeek.com',
  'www.joinwestpeek.com',
  'westpeek.ventures',
  'www.westpeek.ventures',
  'ventures.joinwestpeek.com',
  'westpeekproductions.com',
  'www.westpeekproductions.com',
  'productions.joinwestpeek.com',
  'dilution.joinwestpeek.com',
  'westpeek.live'
] as const;

/**
 * Person types the contacts tab accepts, copied from contacts/create.ts. A site
 * form may not invent a new one: `personTypeFor` picks from this list and
 * throws if a future edit drifts away from the enum the rest of the app reads.
 */
export const PERSON_TYPES = ['investor', 'founder', 'operator', 'lawyer', 'service_provider', 'media', 'general_tech_adjacent', 'unknown'] as const;

export function personTypeFor(form: string) {
  const value = /founder|pitch|apply/i.test(form) ? 'founder' : 'general_tech_adjacent';
  if (!(PERSON_TYPES as readonly string[]).includes(value)) throw new Error(`SITE_FORM_PERSON_TYPE_NOT_IN_ENUM:${value}`);
  return value;
}

/**
 * Free-text fields a site form may carry. Their values become context_summary.
 * `message` is not a name any current form uses; it is accepted so a new form
 * does not have to be added here before its words reach the sheet.
 */
const MESSAGE_FIELDS = ['message', 'description', 'desired_outcome', 'note', 'notes', 'context', 'interest', 'role', 'stage', 'city', 'community_status', 'primary_objective', 'support_timing', 'assessment_diagnosis', 'assessment_classification'] as const;

/** Fields that are never copied into the sheet: bot traps and transport noise. */
const NEVER_COPY = new Set(['website', '_gotcha', 'submission_id', 'lead_source', 'lead_type', 'site', 'form', 'host']);

export function text(value: unknown) {
  return String(value ?? '').replace(/\s+/g, ' ').trim();
}

export function isEmail(value: string) {
  return /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(value);
}

export function allowedOrigins(env: SiteFormEnv) {
  const extra = String(env.WP_NETWORK_OS_INTAKE_ALLOWED_ORIGINS || '')
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean);
  const base = SITE_FORM_ALLOWED_HOSTS.flatMap((host) => [`https://${host}`]);
  return [...new Set([...base, ...extra])];
}

export function validateSiteFormPayload(payload: Record<string, unknown>) {
  const errors: Record<string, string> = {};
  const email = text(payload.email).toLowerCase();
  if (!email) errors.email = 'email is required.';
  else if (!isEmail(email)) errors.email = 'a valid email is required.';
  if (!text(payload.host)) errors.host = 'host is required so the row records which property the person came from.';
  if (!text(payload.form)) errors.form = 'form is required so the row records which form the person filled in.';
  if (!text(payload.submission_id)) errors.submission_id = 'submission_id is required for idempotency.';
  return { ok: Object.keys(errors).length === 0, errors };
}

/**
 * The sheet row for a submission. Deliberate mappings:
 *
 *  person_type     — a founder applying or pitching is a `founder`; everyone
 *                    else who fills in a website form is `general_tech_adjacent`,
 *                    the enum's existing "in the orbit, not yet classified"
 *                    value. No new enum value was invented for site forms.
 *  relationship_type — "Website form — <host> / <form>", so the sheet says which
 *                    door the person walked through without reading the tags.
 *  relationship_owner — "Scooter": every site form already emails him, so he is
 *                    the person who owes the reply.
 */
export function buildSiteFormContact(payload: Record<string, unknown>, proof: ProofContext) {
  const now = new Date().toISOString();
  const host = text(payload.host).toLowerCase();
  const form = text(payload.form);
  const email = text(payload.email).toLowerCase();
  const fullName = text(payload.full_name) || text(payload.name) || email;
  const company = text(payload.company) || text(payload.organization) || '';
  const isFounderForm = /founder|pitch|apply/i.test(form);

  return {
    contact_id: `contact_siteform_${Date.now()}_${crypto.randomUUID().slice(0, 8)}`,
    created_at: now,
    updated_at: now,
    status: 'active',
    full_name: fullName,
    email,
    company,
    person_type: personTypeFor(form),
    deal_flow_prospect: isFounderForm ? 'yes' : 'unknown',
    relationship_type: `Website form — ${host} / ${form}`,
    relationship_owner: 'Scooter',
    priority: 'Normal',
    tags: buildTags(payload).join(', '),
    context_summary: buildContextSummary(payload),
    dealflow_relevance: isFounderForm ? text(payload.lead_source) || 'Submitted a founder form on a West Peek site.' : '',
    founder_relevance: '',
    touch_needed: 'true',
    touch_status: 'needed',
    created_by: createdBy(host, form),
    updated_by: createdBy(host, form),
    ...proofColumns(proof)
  };
}

export function createdBy(host: string, form: string) {
  return `site_form:${host}:${form}`;
}

export function buildTags(payload: Record<string, unknown>) {
  const host = text(payload.host).toLowerCase();
  const form = text(payload.form);
  const tags = new Set<string>(['Website form']);
  if (host) tags.add(host);
  if (form) tags.add(form);
  if (/newsletter|subscribe/i.test(form)) tags.add('Newsletter');
  if (/pitch|apply|founder/i.test(form)) tags.add('Pitch');
  if (/community_viability_assessment|assessment/i.test(form)) tags.add('Community assessment');
  return [...tags];
}

export function buildContextSummary(payload: Record<string, unknown>) {
  const parts: string[] = [];
  for (const field of MESSAGE_FIELDS) {
    const value = text(payload[field]);
    if (value) parts.push(`${field}: ${value}`);
  }
  for (const [key, value] of Object.entries(payload)) {
    if (NEVER_COPY.has(key)) continue;
    if ((MESSAGE_FIELDS as readonly string[]).includes(key)) continue;
    if (['email', 'name', 'full_name', 'company', 'organization'].includes(key)) continue;
    const cleaned = text(value);
    if (cleaned) parts.push(`${key}: ${cleaned}`);
  }
  const host = text(payload.host).toLowerCase();
  const form = text(payload.form);
  const summary = parts.join(' | ') || 'No message fields supplied.';
  return `Website form (${host} / ${form}). ${summary}`.slice(0, 4000);
}

export type ProofContext = { runId: string; testId: string; isProof: boolean };

export function readProofContext(headers: { get(name: string): string | null }): ProofContext {
  const runId = text(headers.get('x-west-peek-proof-run-id'));
  const testId = text(headers.get('x-west-peek-proof-test-id'));
  return { runId, testId, isProof: Boolean(runId) };
}

/**
 * Proof-fixture columns, written exactly as `proof-fixtures/cleanup.ts` expects
 * to find them so the existing cleanup path can remove the row again:
 * `proof_fixture` true, an admitted `proof_run_id`, and a non-empty
 * `proof_test_id`. A proof submission that omits either id is rejected rather
 * than written, because a proof row the cleanup path cannot select is litter in
 * the fund's real relationship database.
 */
export function proofColumns(proof: ProofContext) {
  if (!proof.isProof) {
    return { proof_run_id: '', proof_test_id: '', proof_fixture: '', proof_status: '', proof_created_at: '', proof_expires_at: '', proof_cleaned_at: '', proof_cleanup_run_id: '' };
  }
  const now = new Date().toISOString();
  return {
    proof_run_id: proof.runId,
    proof_test_id: proof.testId,
    proof_fixture: 'true',
    proof_status: 'active',
    proof_created_at: now,
    proof_expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    proof_cleaned_at: '',
    proof_cleanup_run_id: ''
  };
}

export const PROOF_RUN_ID_PATTERN = /^wpno-(?:tier4|runtime-gmail)-[A-Za-z0-9._:-]+$/;

/**
 * Constant-time comparison of the shared secret. Length is compared first and
 * leaks only the length, which is not the secret.
 */
export function secretMatches(submitted: string, expected: string) {
  if (submitted.length !== expected.length) return false;
  let result = 0;
  for (let index = 0; index < submitted.length; index += 1) result |= submitted.charCodeAt(index) ^ expected.charCodeAt(index);
  return result === 0;
}

/**
 * The decision, not the response. Returning a plain verdict rather than a
 * `Response` is what lets the contract test drive this gate directly instead of
 * pattern-matching its source; `site-form.ts` renders the verdict as JSON.
 */
export type SecretVerdict = { ok: true } | { ok: false; status: number; error_code: string; message: string };

export function checkSiteFormSecret(headers: { get(name: string): string | null }, env: SiteFormEnv): SecretVerdict {
  const expected = String(env.WP_NETWORK_OS_INTAKE_SECRET || '').trim();
  if (expected.length < 16) {
    return { ok: false, status: 503, error_code: 'SHARED_SECRET_MISSING', message: 'Site form intake shared secret is not configured.' };
  }
  const origin = text(headers.get('origin'));
  if (origin && !allowedOrigins(env).includes(origin)) {
    return { ok: false, status: 403, error_code: 'ORIGIN_NOT_ALLOWED', message: 'Site form origin is not allowlisted.' };
  }
  const submitted = text(headers.get(SITE_FORM_SECRET_HEADER));
  if (!submitted) {
    return { ok: false, status: 401, error_code: 'SHARED_SECRET_REQUIRED', message: 'Site form intake requires the shared secret header.' };
  }
  if (!secretMatches(submitted, expected)) {
    return { ok: false, status: 401, error_code: 'BAD_SHARED_SECRET', message: 'Site form intake shared secret is not valid.' };
  }
  return { ok: true };
}

export async function submissionHash(value: string) {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(`site_form:${value}`));
  let binary = '';
  for (const byte of new Uint8Array(digest)) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '').slice(0, 32);
}

/**
 * The contacts row this email already owns, or undefined.
 *
 * A proof submission may only ever match another row of its own proof run, and
 * a real submission may never match a proof row. Without that split a Tier 4
 * fixture using a real person's address would overwrite that person's record,
 * and the cleanup path would then delete a genuine contact.
 */
export function findExistingContact(rows: Array<{ rowNumber: number; record: Record<string, string> }>, email: string, proof: ProofContext) {
  const wanted = email.trim().toLowerCase();
  if (!wanted) return undefined;
  return rows.find(({ record }) => {
    if (String(record.email || '').trim().toLowerCase() !== wanted) return false;
    const rowIsProof = String(record.proof_fixture || '').toLowerCase() === 'true';
    if (proof.isProof) return rowIsProof && String(record.proof_run_id || '') === proof.runId;
    return !rowIsProof;
  });
}

/**
 * The updated row for a contact this email already owns.
 *
 * Kept: contact_id, created_at, created_by, status, and the existing
 * relationship_owner — a person the fund already assigned to someone does not
 * change hands because they filled in a newsletter box. Touched: updated_at,
 * updated_by, the tag union, and the context summary, which gains the new
 * submission rather than replacing what was there.
 */
export function buildSiteFormUpdate(existing: Record<string, string>, payload: Record<string, unknown>, proof: ProofContext): Record<string, string> {
  const now = new Date().toISOString();
  const host = text(payload.host).toLowerCase();
  const form = text(payload.form);
  const existingTags = String(existing.tags || '').split(',').map((tag) => tag.trim()).filter(Boolean);
  const tags = [...new Set([...existingTags, ...buildTags(payload)])].join(', ');
  const newContext = buildContextSummary(payload);
  const priorContext = String(existing.context_summary || '').trim();
  const context = (priorContext && !priorContext.includes(newContext) ? `${priorContext}\n${now}: ${newContext}` : newContext).slice(-8000);

  return {
    ...existing,
    updated_at: now,
    full_name: String(existing.full_name || '').trim() || text(payload.full_name) || text(payload.name) || text(payload.email).toLowerCase(),
    company: String(existing.company || '').trim() || text(payload.company) || text(payload.organization) || '',
    relationship_type: String(existing.relationship_type || '').trim() || `Website form — ${host} / ${form}`,
    relationship_owner: String(existing.relationship_owner || '').trim() || 'Scooter',
    priority: String(existing.priority || '').trim() || 'Normal',
    tags,
    context_summary: context,
    touch_needed: 'true',
    touch_status: 'needed',
    updated_by: createdBy(host, form),
    ...(proof.isProof ? proofColumns(proof) : {})
  };
}

