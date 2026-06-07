import { extractIntakeFromImage, extractIntakeFromText, type AnthropicEnv } from '../../../_shared/anthropic';
import { requireAuthenticatedUser, type AuthEnv } from '../../../_shared/auth';
import { transcribeAudioWithGoogle, type GoogleSpeechEnv } from '../../../_shared/googleSpeech';
import { json } from '../../../_shared/json';
import { assertAudioFile, assertImageFile, fileToBase64, getRequiredFile, stringField, type MediaKind } from '../../../_shared/media';
import { appendRecord, sheetsUnavailable, type RuntimeEnv } from '../../../_shared/sheets';

type Env = RuntimeEnv & AnthropicEnv & AuthEnv & GoogleSpeechEnv;
type Context = { request: Request; env: Env };

type TraceStage = { stage: string; status: 'passed' | 'blocked' | 'failed'; detail: string };

const ALLOWED_IMAGE_KINDS = new Set<MediaKind>(['business_card', 'notes_screenshot']);
const ALLOWED_AUDIO_KINDS = new Set<MediaKind>(['voice_note']);

export async function onRequestPost({ request, env }: Context) {
  const traceId = `capture_trace_${Date.now()}_${crypto.randomUUID().slice(0, 8)}`;
  const trace: TraceStage[] = [];
  let user: { email: string; role: string };

  try {
    user = await requireAuthenticatedUser(request, env);
    trace.push({ stage: 'auth', status: 'passed', detail: `authenticated allowlisted operator ${user.email}` });
  } catch (error) {
    trace.push({ stage: 'auth', status: 'blocked', detail: 'missing or invalid signed West Peek session' });
    return json({ ok: false, error: error instanceof Error ? error.message : 'Authentication required.', trace_id: traceId, internal_data_trace: trace, human_review_required: true, execution_allowed: false }, { status: 401 });
  }

  let form: FormData;
  try {
    form = await request.formData();
    trace.push({ stage: 'request_parse', status: 'passed', detail: 'multipart form parsed' });
  } catch {
    trace.push({ stage: 'request_parse', status: 'failed', detail: 'request must be multipart/form-data' });
    return json({ ok: false, error: 'multipart/form-data body is required.', trace_id: traceId, internal_data_trace: trace }, { status: 400 });
  }

  const requestedKind = normalizeKind(stringField(form, 'capture_type', 'business_card'));
  const contextNote = stringField(form, 'context_note');
  const capturedBy = stringField(form, 'captured_by', user.email) || user.email;
  const eventId = stringField(form, 'event_id');
  const eventName = stringField(form, 'event_name');
  const eventSlug = stringField(form, 'event_slug');
  let file: File;
  try {
    file = getRequiredFile(form);
  } catch (error) {
    trace.push({ stage: 'file_validation', status: 'blocked', detail: error instanceof Error ? error.message : 'file is required' });
    return json({ ok: false, error: error instanceof Error ? error.message : 'file is required.', trace_id: traceId, internal_data_trace: trace }, { status: 400 });
  }

  const now = new Date().toISOString();

  try {
    let extraction;
    let rawText = contextNote;
    let extractedText = '';
    let transcriptText = '';
    let sourceFileType = file.type || file.name.split('.').pop() || '';

    if (ALLOWED_IMAGE_KINDS.has(requestedKind)) {
      const mediaType = assertImageFile(file);
      sourceFileType = mediaType;
      trace.push({ stage: 'image_validation', status: 'passed', detail: `${file.name || 'image'} accepted as ${mediaType}` });
      const base64 = await fileToBase64(file);
      trace.push({ stage: 'image_ocr', status: 'passed', detail: 'image prepared for Claude vision OCR/extraction' });
      extraction = await extractIntakeFromImage(env, { base64, mediaType, sourceType: requestedKind, contextNote, requestedBy: user.email });
      extractedText = extraction.raw_extracted_text;
      rawText = [contextNote, extractedText].filter(Boolean).join('\n\n');
      trace.push({ stage: 'claude_vision', status: 'passed', detail: `Claude vision returned ${extraction.confidence}-confidence extraction` });
    } else if (ALLOWED_AUDIO_KINDS.has(requestedKind)) {
      const mediaType = assertAudioFile(file);
      sourceFileType = mediaType;
      trace.push({ stage: 'audio_validation', status: 'passed', detail: `${file.name || 'audio'} accepted as ${mediaType}` });
      const transcript = await transcribeAudioWithGoogle(env, file);
      transcriptText = transcript.transcript;
      rawText = [contextNote, transcriptText].filter(Boolean).join('\n\n');
      trace.push({ stage: 'google_speech_to_text', status: 'passed', detail: `${transcript.provider}/${transcript.model} returned ${transcript.confidence}-confidence transcript` });
      extraction = await extractIntakeFromText(env, { rawText, sourceType: requestedKind, requestedBy: user.email });
      extractedText = extraction.raw_extracted_text;
      trace.push({ stage: 'claude_structuring', status: 'passed', detail: `Claude structured transcript into ${extraction.confidence}-confidence intake draft` });
    } else {
      trace.push({ stage: 'capture_type_validation', status: 'blocked', detail: `unsupported capture_type ${requestedKind}` });
      return json({ ok: false, error: 'Unsupported capture_type. Use business_card, notes_screenshot, or voice_note.', trace_id: traceId, internal_data_trace: trace }, { status: 400 });
    }

    const intake = {
      intake_id: `intake_${Date.now()}_${crypto.randomUUID().slice(0, 8)}`,
      created_at: now,
      updated_at: now,
      source: eventId ? (requestedKind === 'voice_note' ? 'event_voice_note' : requestedKind === 'notes_screenshot' ? 'event_screenshot' : 'event_card_upload') : (requestedKind === 'voice_note' ? 'voice_note' : requestedKind),
      capture_type: requestedKind,
      captured_by: capturedBy,
      source_user_email: user.email,
      source_file_name: file.name || '',
      source_file_type: sourceFileType,
      gmail_message_id: '',
      gmail_thread_id: '',
      raw_text: rawText || `Uploaded ${requestedKind} for West Peek Network review.`,
      email_subject: '',
      email_from: '',
      email_to: '',
      email_date: '',
      parsed_name: extraction.name,
      parsed_email: extraction.email,
      parsed_phone: extraction.phone,
      parsed_company: extraction.company,
      parsed_title: extraction.title,
      parsed_website: extraction.website,
      parsed_notes: extraction.context,
      extracted_text: extractedText,
      transcript_text: transcriptText,
      missing_fields: extraction.missing_fields.join(', '),
      ai_summary: extraction.context,
      ai_confidence: extraction.confidence,
      internal_data_trace: JSON.stringify(trace),
      human_review_required: 'true',
      execution_allowed: 'false',
      review_status: 'pending_human_review',
      event_id: eventId,
      event_name: eventName,
      event_slug: eventSlug
    };

    await appendRecord(env, 'intake_queue', intake);
    if (eventId) {
      await appendRecord(env, 'event_attendees', {
        event_attendee_id: `event_attendee_${Date.now()}_${crypto.randomUUID().slice(0, 8)}`,
        event_id: eventId,
        event_name: eventName,
        event_slug: eventSlug,
        created_at: now,
        updated_at: now,
        public_name: extraction.name,
        public_email: extraction.email,
        public_company: extraction.company,
        public_title: extraction.title,
        public_phone: extraction.phone,
        public_linkedin: extraction.website,
        public_interest: '',
        private_context: contextNote,
        private_voice_transcript: transcriptText,
        ai_summary: extraction.context,
        review_status: 'pending_human_review',
        confidence: extraction.confidence,
        missing_fields: extraction.missing_fields.join(', '),
        source_type: requestedKind === 'voice_note' ? 'event_voice_note' : requestedKind === 'notes_screenshot' ? 'event_screenshot' : 'event_card_upload',
        created_by: user.email,
        source_intake_id: intake.intake_id,
        consent_follow_up: 'false'
      });
      trace.push({ stage: 'event_linkage', status: 'passed', detail: 'event attendee row appended from authenticated capture route' });
    }
    trace.push({ stage: 'persistence', status: 'passed', detail: 'pending_human_review row appended to intake_queue' });
    trace.push({ stage: 'execution_guardrail', status: 'passed', detail: 'no contact added and no message/card sent' });

    return json({ ok: true, intake, trace_id: traceId, internal_data_trace: trace, human_review_required: true, execution_allowed: false, execution_status: 'not_executed', persistence: 'google_sheets' });
  } catch (error) {
    const detail = error instanceof Error ? redactProviderError(error.message) : 'Media intake failed.';
    const status = /unsupported|must be|HEIC|required/i.test(detail) ? 400 : detail.includes('Google Sheets') ? 503 : 502;
    trace.push({ stage: 'runtime', status: status === 400 ? 'blocked' : 'failed', detail });
    if (detail.includes('Google Sheets')) return sheetsUnavailable(error);
    return json({ ok: false, error: detail, trace_id: traceId, internal_data_trace: trace, human_review_required: true, execution_allowed: false, execution_status: 'not_executed' }, { status });
  }
}

function normalizeKind(value: string): MediaKind {
  const normalized = value.trim().toLowerCase().replace(/[^a-z0-9]+/g, '_');
  if (normalized === 'business_card' || normalized === 'card') return 'business_card';
  if (normalized === 'notes_screenshot' || normalized === 'screenshot' || normalized === 'note_screenshot') return 'notes_screenshot';
  if (normalized === 'voice_note' || normalized === 'audio') return 'voice_note';
  return normalized as MediaKind;
}

function redactProviderError(message: string) {
  return message.replace(/sk-ant-[a-zA-Z0-9_-]+/g, 'sk-ant-[redacted]').replace(/ya29\.[a-zA-Z0-9_.-]+/g, 'ya29.[redacted]');
}
