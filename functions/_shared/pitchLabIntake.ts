import { json } from './json';

export interface PitchLabIntakeEnv {
  PITCH_LAB_SHARED_SECRET?: string;
  PITCH_LAB_ALLOWED_ORIGIN?: string;
}

const REQUIRED_STORY_FIELDS = [
  'one_line_pitch',
  'company_summary',
  'customer',
  'problem',
  'solution',
  'proof_or_traction',
  'founder_edge',
  'why_now',
  'biggest_story_gap',
  'biggest_objection',
  'suggested_next_relationships',
  'next_steps'
] as const;

export function validatePitchLabPayload(payload: Record<string, unknown>) {
  const errors: Record<string, string> = {};
  if (payload.source !== 'pitch_lab') errors.source = 'source must be pitch_lab.';
  if (payload.capture_type !== 'pitch_practice') errors.capture_type = 'capture_type must be pitch_practice.';
  const consent = objectAt(payload, 'consent');
  if (consent.share_with_west_peek !== true) errors.consent = 'share_with_west_peek consent is required.';
  if (String(consent.consent_version || '') !== 'pitch-lab-share-v1') errors.consent_version = 'unsupported consent version.';
  if (Number.isNaN(Date.parse(String(consent.consented_at || '')))) errors.consented_at = 'consented_at must be ISO-compatible.';
  const founder = objectAt(payload, 'founder');
  if (text(founder.name).length < 2) errors.founder_name = 'founder.name is required.';
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(text(founder.email).toLowerCase())) errors.founder_email = 'valid founder.email is required.';
  if (text(founder.company_name).length < 2) errors.company_name = 'founder.company_name is required.';
  const card = objectAt(payload, 'pitch_story_card');
  for (const key of REQUIRED_STORY_FIELDS) {
    if (text(card[key]).length < 8) errors[`pitch_story_card.${key}`] = `${key} is required.`;
  }
  return { ok: Object.keys(errors).length === 0, errors };
}

export function buildPendingPitchLabIntake(payload: Record<string, unknown>) {
  const now = new Date().toISOString();
  const founder = objectAt(payload, 'founder');
  const consent = objectAt(payload, 'consent');
  const card = objectAt(payload, 'pitch_story_card');
  const rawText = [
    `Pitch Lab founder share`,
    `Founder: ${text(founder.name)}`,
    `Email: ${text(founder.email).toLowerCase()}`,
    `Company: ${text(founder.company_name)}`,
    `Website: ${text(founder.website)}`,
    `One-line pitch: ${text(card.one_line_pitch)}`,
    `Problem: ${text(card.problem)}`,
    `Solution: ${text(card.solution)}`,
    `Proof/traction: ${text(card.proof_or_traction)}`,
    `Founder edge: ${text(card.founder_edge)}`,
    `Why now: ${text(card.why_now)}`,
    `Next steps: ${text(card.next_steps)}`
  ].join('\n');
  return {
    intake_id: `intake_pitchlab_${Date.now()}_${crypto.randomUUID().slice(0, 8)}`,
    created_at: now,
    updated_at: now,
    source: 'pitch_lab',
    capture_type: 'pitch_practice',
    captured_by: 'pitch_lab_public_form',
    source_user_email: text(founder.email).toLowerCase(),
    source_trigger: 'pitch_lab_share',
    trigger_intent: 'deal_flow',
    person_type: 'founder',
    deal_flow_prospect: 'unknown',
    deal_context: text(card.company_summary),
    raw_text: rawText,
    parsed_name: text(founder.name),
    parsed_email: text(founder.email).toLowerCase(),
    parsed_company: text(founder.company_name),
    parsed_website: text(founder.website),
    parsed_notes: JSON.stringify({ pitch_story_card: card, consent }),
    parsed_owner: 'Unassigned',
    parsed_touch: 'undecided',
    parsed_priority: 'Normal',
    parsed_needs_touch: 'false',
    ai_summary: text(card.one_line_pitch),
    ai_confidence: 'medium',
    internal_data_trace: JSON.stringify([
      { stage: 'pitch_lab_consent', status: 'passed', detail: 'founder explicitly consented to share Pitch Story Card with West Peek' },
      { stage: 'signature', status: 'passed', detail: 'server-to-server HMAC signature verified' },
      { stage: 'human_review_gate', status: 'passed', detail: 'pending intake only; no contact created automatically' }
    ]),
    human_review_required: 'true',
    execution_allowed: 'false',
    review_status: 'pending_human_review',
    reviewed_by: '',
    reviewed_at: '',
    converted_contact_id: '',
    attached_contact_id: '',
    dismiss_reason: ''
  };
}

export async function requirePitchLabSignature(request: Request, env: PitchLabIntakeEnv, bodyText: string) {
  const secret = String(env.PITCH_LAB_SHARED_SECRET || '').trim();
  if (secret.length < 16) return { ok: false, response: json({ ok: false, error_code: 'SHARED_SECRET_MISSING', message: 'Pitch Lab shared secret is not configured.' }, { status: 503 }) };
  const submittedAt = request.headers.get('x-pitch-lab-submitted-at') || '';
  const signature = request.headers.get('x-pitch-lab-signature') || '';
  const origin = request.headers.get('origin') || '';
  const allowedOrigin = String(env.PITCH_LAB_ALLOWED_ORIGIN || '').trim();
  if (allowedOrigin && origin && origin !== allowedOrigin) return { ok: false, response: json({ ok: false, error_code: 'ORIGIN_NOT_ALLOWED', message: 'Pitch Lab origin is not allowlisted.' }, { status: 403 }) };
  if (!submittedAt || !signature) return { ok: false, response: json({ ok: false, error_code: 'SIGNATURE_REQUIRED', message: 'Signed Pitch Lab request is required.' }, { status: 401 }) };
  const submittedAtMs = Date.parse(submittedAt);
  if (Number.isNaN(submittedAtMs)) return { ok: false, response: json({ ok: false, error_code: 'BAD_TIMESTAMP', message: 'Invalid submitted timestamp.' }, { status: 401 }) };
  if (Math.abs(Date.now() - submittedAtMs) > 10 * 60 * 1000) return { ok: false, response: json({ ok: false, error_code: 'STALE_REQUEST', message: 'Pitch Lab request timestamp is outside the allowed replay window.' }, { status: 401 }) };
  const expected = await sign(secret, `${submittedAt}.${bodyText}`);
  if (!timingSafeEqual(signature, expected)) return { ok: false, response: json({ ok: false, error_code: 'BAD_SIGNATURE', message: 'Invalid Pitch Lab signature.' }, { status: 401 }) };
  return { ok: true };
}

async function sign(secret: string, message: string) {
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const signature = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(message));
  return base64UrlBytes(new Uint8Array(signature));
}

function timingSafeEqual(a: string, b: string) {
  if (a.length !== b.length) return false;
  let result = 0;
  for (let index = 0; index < a.length; index += 1) result |= a.charCodeAt(index) ^ b.charCodeAt(index);
  return result === 0;
}

function base64UrlBytes(input: Uint8Array) {
  let binary = '';
  for (const byte of input) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function objectAt(payload: Record<string, unknown>, key: string) {
  const value = payload[key];
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function text(value: unknown) {
  return String(value ?? '').replace(/\s+/g, ' ').trim();
}
