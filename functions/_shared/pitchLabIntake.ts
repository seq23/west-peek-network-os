import { json } from './json';

export interface PitchLabIntakeEnv {
  PITCH_LAB_SHARED_SECRET?: string;
  PITCH_LAB_ALLOWED_ORIGIN?: string;
}

const STORY_PACKET_FIELDS = [
  'one_liner', 'company_summary', 'customer', 'problem', 'solution', 'proof', 'founder_edge', 'why_now', 'help_needed'
] as const;

export function validatePitchLabProfileLeadPayload(payload: Record<string, unknown>) {
  const errors: Record<string, string> = {};
  if (payload.source !== 'pitch_lab') errors.source = 'source must be pitch_lab.';
  if (payload.capture_type !== 'founder_profile_lead') errors.capture_type = 'capture_type must be founder_profile_lead.';
  if (payload.trigger_intent !== 'relationship_routing') errors.trigger_intent = 'trigger_intent must be relationship_routing.';
  const founder = objectAt(payload, 'founder');
  if (text(founder.name).length < 2) errors.founder_name = 'founder.name is required.';
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(text(founder.email).toLowerCase())) errors.founder_email = 'valid founder.email is required.';
  if (text(founder.company_name).length < 2) errors.company_name = 'founder.company_name is required.';
  const consent = objectAt(payload, 'consent');
  if (consent.profile_capture_notice_shown !== true) errors.profile_capture_notice_shown = 'profile capture notice is required.';
  const disclaimers = objectAt(payload, 'disclaimers_acknowledged');
  for (const key of ['ai_disclosure', 'answers_private_until_share', 'no_guaranteed_follow_up', 'network_review_only']) {
    if (disclaimers[key] !== true) errors[`disclaimers_acknowledged.${key}`] = `${key} acknowledgement is required.`;
  }
  if (JSON.stringify(payload).includes('pitch_story_card') || JSON.stringify(payload).includes('one_liner')) errors.pitch_answers = 'profile lead must not include pitch answers.';
  return { ok: Object.keys(errors).length === 0, errors };
}

export function validatePitchLabPacketPayload(payload: Record<string, unknown>) {
  const errors: Record<string, string> = {};
  if (payload.source !== 'pitch_lab') errors.source = 'source must be pitch_lab.';
  if (payload.capture_type !== 'founder_story_packet') errors.capture_type = 'capture_type must be founder_story_packet.';
  if (payload.trigger_intent !== 'relationship_routing') errors.trigger_intent = 'trigger_intent must be relationship_routing.';
  if ((payload as any).pitch_story_card) errors.pitch_story_card = 'old pitch_story_card payloads are not accepted.';
  if (payload.capture_type === 'pitch_practice' || payload.trigger_intent === 'deal_flow') errors.legacy_payload = 'old Pitch Lab deal_flow payloads are not accepted.';
  const founder = objectAt(payload, 'founder');
  if (text(founder.name).length < 2) errors.founder_name = 'founder.name is required.';
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(text(founder.email).toLowerCase())) errors.founder_email = 'valid founder.email is required.';
  if (text(founder.company_name).length < 2) errors.company_name = 'founder.company_name is required.';
  const consent = objectAt(payload, 'consent');
  if (consent.founder_story_packet_shared !== true) errors.consent = 'founder_story_packet_shared consent is required.';
  const disclaimers = objectAt(payload, 'disclaimers_acknowledged');
  for (const key of ['ai_disclosure', 'no_investment_advice', 'no_guaranteed_follow_up', 'network_review_only']) {
    if (disclaimers[key] !== true) errors[`disclaimers_acknowledged.${key}`] = `${key} acknowledgement is required.`;
  }
  const packet = objectAt(payload, 'packet');
  for (const key of STORY_PACKET_FIELDS) {
    if (text(packet[key]).length < 4) errors[`packet.${key}`] = `${key} is required.`;
  }
  return { ok: Object.keys(errors).length === 0, errors };
}

export function buildPitchLabProfileLeadIntake(payload: Record<string, unknown>, profile: { profile_id?: string; profile_created?: boolean; database_write_status?: string } = {}) {
  const now = new Date().toISOString();
  const founder = objectAt(payload, 'founder');
  return {
    intake_id: `intake_pitchlab_profile_${Date.now()}_${crypto.randomUUID().slice(0, 8)}`,
    created_at: now,
    updated_at: now,
    source: 'pitch_lab',
    capture_type: 'founder_profile_lead',
    captured_by: 'pitch_lab_profile_gate',
    source_user_email: text(founder.email).toLowerCase(),
    source_file_name: '', source_file_type: '', gmail_message_id: '', gmail_thread_id: '',
    source_trigger: 'pitch_lab_profile_gate',
    trigger_intent: 'relationship_routing',
    person_type: 'founder',
    deal_flow_prospect: 'unknown',
    deal_context: 'Pitch Lab founder profile lead only; pitch answers remain private until packet consent.',
    raw_text: [`Pitch Lab profile lead`, `Founder: ${text(founder.name)}`, `Email: ${text(founder.email).toLowerCase()}`, `Company: ${text(founder.company_name)}`, `Website: ${text(founder.website)}`].join('\n'),
    email_subject: '', email_from: text(founder.email).toLowerCase(), email_to: '', email_date: '',
    parsed_name: text(founder.name), parsed_email: text(founder.email).toLowerCase(), parsed_phone: '', parsed_company: text(founder.company_name), parsed_title: '', parsed_website: text(founder.website),
    parsed_notes: JSON.stringify({ pitch_lab_stage: 'profile_gate', ai_persona: text(payload.ai_persona || 'AI Scooter'), network_intake: true, profile_id: profile.profile_id || '', profile_created: profile.profile_created === true, database_write_status: profile.database_write_status || 'stored', consent: objectAt(payload, 'consent'), disclaimers_acknowledged: objectAt(payload, 'disclaimers_acknowledged') }),
    parsed_owner: 'Unassigned', parsed_touch: 'undecided', parsed_priority: 'Normal', parsed_due: '', parsed_needs_touch: 'false',
    extracted_text: '', transcript_text: '', missing_fields: '', ai_summary: `Pitch Lab profile lead: ${text(founder.company_name)}`, ai_confidence: 'medium',
    internal_data_trace: JSON.stringify([{ stage: 'profile_capture', status: 'passed', detail: 'founder self-submitted minimal profile through Pitch Lab profile gate' }, { stage: 'database_write', status: 'passed', detail: profile.database_write_status || 'stored' }, { stage: 'privacy_boundary', status: 'passed', detail: 'no pitch answers included in profile lead' }]),
    human_review_required: 'false', execution_allowed: 'false', review_status: 'lead_captured', reviewed_by: '', reviewed_at: '', converted_contact_id: '', attached_contact_id: profile.profile_id || '', dismiss_reason: '', event_id: '', event_name: '', event_slug: ''
  };
}

export function buildPitchLabPacketIntake(payload: Record<string, unknown>, profile: { profile_id?: string; profile_created?: boolean; database_write_status?: string } = {}) {
  const now = new Date().toISOString();
  const founder = objectAt(payload, 'founder');
  const packet = objectAt(payload, 'packet');
  const rawText = [
    `Pitch Lab Founder Story Packet`,
    `Founder: ${text(founder.name)}`,
    `Email: ${text(founder.email).toLowerCase()}`,
    `Company: ${text(founder.company_name)}`,
    `Website: ${text(founder.website)}`,
    `One-line pitch: ${text(packet.one_liner)}`,
    `Problem: ${text(packet.problem)}`,
    `Solution: ${text(packet.solution)}`,
    `Proof: ${text(packet.proof)}`,
    `Founder edge: ${text(packet.founder_edge)}`,
    `Why now: ${text(packet.why_now)}`,
    `Help needed: ${text(packet.help_needed)}`
  ].join('\n');
  const profileLeadId = text(payload.profile_capture_intake_id);
  return {
    intake_id: `intake_pitchlab_packet_${Date.now()}_${crypto.randomUUID().slice(0, 8)}`,
    created_at: now,
    updated_at: now,
    source: 'pitch_lab',
    capture_type: 'founder_story_packet',
    captured_by: 'pitch_lab_share_flow',
    source_user_email: text(founder.email).toLowerCase(),
    source_file_name: '', source_file_type: '', gmail_message_id: '', gmail_thread_id: '',
    source_trigger: 'pitch_lab_founder_story_packet_shared',
    trigger_intent: 'relationship_routing',
    person_type: 'founder',
    deal_flow_prospect: 'unknown',
    deal_context: text(packet.company_summary),
    raw_text: rawText,
    email_subject: '', email_from: text(founder.email).toLowerCase(), email_to: '', email_date: '',
    parsed_name: text(founder.name), parsed_email: text(founder.email).toLowerCase(), parsed_phone: '', parsed_company: text(founder.company_name), parsed_title: '', parsed_website: text(founder.website),
    parsed_notes: JSON.stringify({ pitch_lab_stage: 'founder_story_packet_submitted', profile_capture_intake_id: profileLeadId, linked_profile_id: profile.profile_id || '', ai_persona: text(payload.ai_persona || 'AI Scooter'), network_intake: true, append_to_existing_profile: payload.append_to_existing_profile === true, packet, consent: objectAt(payload, 'consent'), disclaimers_acknowledged: objectAt(payload, 'disclaimers_acknowledged') }),
    parsed_owner: 'Unassigned', parsed_touch: 'undecided', parsed_priority: 'Normal', parsed_due: '', parsed_needs_touch: 'false',
    extracted_text: '', transcript_text: '', missing_fields: '', ai_summary: text(packet.one_liner), ai_confidence: 'medium',
    internal_data_trace: JSON.stringify([{ stage: 'packet_consent', status: 'passed', detail: 'founder explicitly shared Founder Story Packet for network review and relationship routing' }, { stage: 'database_write', status: 'passed', detail: profile.database_write_status || 'stored' }, { stage: 'execution_guardrail', status: 'passed', detail: 'database intake only; no automatic outreach, funding review, intro, or follow-up' }]),
    human_review_required: 'true', execution_allowed: 'false', review_status: 'pending_network_review', reviewed_by: '', reviewed_at: '', converted_contact_id: '', attached_contact_id: profile.profile_id || '', dismiss_reason: '', event_id: '', event_name: '', event_slug: ''
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
function base64UrlBytes(input: Uint8Array) { let binary = ''; for (const byte of input) binary += String.fromCharCode(byte); return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, ''); }
function objectAt(payload: Record<string, unknown>, key: string) { const value = payload[key]; return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {}; }
function text(value: unknown) { return String(value ?? '').replace(/\s+/g, ' ').trim(); }
