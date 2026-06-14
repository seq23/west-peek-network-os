import { createRelationshipSuggestion, type AnthropicEnv } from '../../../_shared/anthropic';
import { requireAuthenticatedUser, type AuthEnv } from '../../../_shared/auth';
import { json, readJson } from '../../../_shared/json';
import { appendRecord, sheetsUnavailable, type RuntimeEnv } from '../../../_shared/sheets';

type Env = RuntimeEnv & AnthropicEnv & AuthEnv;
type Context = { request: Request; env: Env };

type CreateSuggestionBody = {
  raw_text?: string;
  source_entity_type?: string;
  source_entity_id?: string;
  suggestion_type?: string;
  proof_run_id?: string;
};

type TraceStage = {
  stage: string;
  status: 'passed' | 'blocked' | 'failed';
  detail: string;
};

const MAX_RAW_TEXT_CHARS = 6000;
const ALLOWED_SOURCE_ENTITY_TYPES = new Set(['intake_queue', 'contact', 'relationship_touch', 'adhoc']);
const ALLOWED_SUGGESTION_TYPES = new Set(['follow_up_recommendation', 'relationship_summary', 'touch_recommendation', 'duplicate_review']);

export async function onRequestPost({ request, env }: Context) {
  const traceId = `ai_trace_${Date.now()}_${crypto.randomUUID().slice(0, 8)}`;
  const trace: TraceStage[] = [];

  let user: { email: string; role: string };
  try {
    user = await requireAuthenticatedUser(request, env);
    trace.push({ stage: 'auth', status: 'passed', detail: `authenticated allowlisted operator ${user.email}` });
  } catch (error) {
    trace.push({ stage: 'auth', status: 'blocked', detail: 'missing or invalid signed West Peek session' });
    return json({
      ok: false,
      error: error instanceof Error ? error.message : 'Authentication required.',
      trace_id: traceId,
      internal_data_trace: trace,
      human_review_required: true,
      execution_allowed: false,
      execution_status: 'not_executed'
    }, { status: 401 });
  }

  let body: CreateSuggestionBody;
  try {
    body = await readJson<CreateSuggestionBody>(request);
    trace.push({ stage: 'request_parse', status: 'passed', detail: 'JSON body parsed' });
  } catch (error) {
    trace.push({ stage: 'request_parse', status: 'failed', detail: 'invalid JSON body' });
    return json({ ok: false, error: error instanceof Error ? error.message : 'Invalid request body.', trace_id: traceId, internal_data_trace: trace }, { status: 400 });
  }

  const rawText = (body.raw_text || '').trim();
  if (!rawText) return validationError(traceId, trace, 'raw_text is required.');
  if (rawText.length > MAX_RAW_TEXT_CHARS) return validationError(traceId, trace, `raw_text must be ${MAX_RAW_TEXT_CHARS} characters or fewer.`);

  const sourceEntityType = normalizeAllowed(body.source_entity_type, ALLOWED_SOURCE_ENTITY_TYPES, 'adhoc');
  const suggestionType = normalizeAllowed(body.suggestion_type, ALLOWED_SUGGESTION_TYPES, 'follow_up_recommendation');
  const sourceEntityId = cleanIdentifier(body.source_entity_id) || `adhoc_${Date.now()}_${crypto.randomUUID().slice(0, 8)}`;
  trace.push({ stage: 'input_validation', status: 'passed', detail: `${rawText.length} chars accepted for ${sourceEntityType}/${suggestionType}` });

  const now = new Date().toISOString();
  const proofRunId = cleanProofRunId(body.proof_run_id || request.headers.get('x-west-peek-proof-run-id') || '');
  const proofMeta = proofRunId ? { proof_run_id: proofRunId, proof_fixture: true, proof_status: 'active', proof_created_at: now, proof_expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() } : {};

  try {
    const ai = await createRelationshipSuggestion(env, {
      rawText,
      sourceEntityType,
      sourceEntityId,
      requestedBy: user.email
    });
    trace.push({ stage: 'anthropic_call', status: 'passed', detail: `Claude returned normalized ${ai.confidence}-confidence suggestion` });

    const suggestion = {
      suggestion_id: `suggestion_${Date.now()}_${crypto.randomUUID().slice(0, 8)}`,
      created_at: now,
      updated_at: now,
      suggestion_type: suggestionType,
      source_entity_type: sourceEntityType,
      source_entity_id: sourceEntityId,
      confidence: ai.confidence,
      status: 'pending_human_review',
      suggested_payload: JSON.stringify({
        summary: ai.summary,
        suggested_follow_up: ai.suggested_follow_up,
        suggested_touch_method: ai.suggested_touch_method,
        suggested_priority: ai.suggested_priority,
        suggested_tags: ai.suggested_tags,
        human_review_required: true,
        execution_allowed: false,
        execution_status: 'not_executed'
      }),
      reasoning_summary: ai.reasoning_summary,
      reviewed_by: '',
      reviewed_at: '',
      applied_entity_type: '',
      applied_entity_id: '',
      created_by_agent: 'claude_relationship_assistant',
      ...proofMeta
    };

    const approval = {
      approval_id: `approval_${Date.now()}_${crypto.randomUUID().slice(0, 8)}`,
      created_at: now,
      updated_at: now,
      approval_type: 'ai_suggestion_review',
      source_entity_type: 'ai_suggestion',
      source_entity_id: suggestion.suggestion_id,
      requested_by: user.email,
      assigned_to: 'Sequoia',
      relationship_owner: 'Sequoia',
      status: 'pending',
      risk_level: 'medium',
      suggested_payload: suggestion.suggested_payload,
      approved_by: '',
      approved_at: '',
      rejected_by: '',
      rejected_at: '',
      ...proofMeta
    };
    const notification = {
      notification_id: `notification_${Date.now()}_${crypto.randomUUID().slice(0, 8)}`,
      created_at: now,
      updated_at: now,
      recipient_email: user.email,
      notification_type: 'ai_suggestion_ready',
      channel: 'in_app',
      subject: 'AI Helper suggestion needs review',
      body_preview: ai.summary,
      entity_type: 'approval',
      entity_id: approval.approval_id,
      priority: 'Normal',
      status: 'unread',
      sent_at: now,
      read_at: '',
      resolved_at: '',
      failure_reason: '',
      ...proofMeta
    };

    await appendRecord(env, 'ai_suggestions', suggestion);
    await appendRecord(env, 'approvals', approval);
    await appendRecord(env, 'notifications', notification);
    trace.push({ stage: 'persistence', status: 'passed', detail: 'AI suggestion, linked pending approval, and unread in-app notification appended' });
    trace.push({ stage: 'execution_guardrail', status: 'passed', detail: 'no email, gift, merge, delete, ownership change, or approval executed' });

    return json({
      ok: true,
      suggestion,
      approval,
      notification,
      provider: 'anthropic',
      model: env.ANTHROPIC_MODEL || 'claude-3-5-haiku-latest',
      trace_id: traceId,
      internal_data_trace: trace,
      human_review_required: true,
      execution_allowed: false,
      execution_status: 'not_executed',
      persistence: 'google_sheets'
    });
  } catch (error) {
    if (error instanceof Error && error.message.includes('Google Sheets')) {
      trace.push({ stage: 'persistence', status: 'failed', detail: 'Google Sheets append failed' });
      return json({ ok: false, error: error.message, trace_id: traceId, internal_data_trace: trace, human_review_required: true, execution_allowed: false, execution_status: 'not_executed' }, { status: 503 });
    }
    trace.push({ stage: 'anthropic_or_runtime', status: 'failed', detail: error instanceof Error ? redactProviderError(error.message) : 'AI suggestion generation failed' });
    return json({
      ok: false,
      error: error instanceof Error ? redactProviderError(error.message) : 'AI suggestion generation failed.',
      trace_id: traceId,
      internal_data_trace: trace,
      human_review_required: true,
      execution_allowed: false,
      execution_status: 'not_executed'
    }, { status: 503 });
  }
}

function validationError(traceId: string, trace: TraceStage[], error: string) {
  trace.push({ stage: 'input_validation', status: 'blocked', detail: error });
  return json({ ok: false, error, trace_id: traceId, internal_data_trace: trace, human_review_required: true, execution_allowed: false, execution_status: 'not_executed' }, { status: 400 });
}

function normalizeAllowed(value: string | undefined, allowed: Set<string>, fallback: string) {
  const normalized = String(value || '').trim().toLowerCase();
  return allowed.has(normalized) ? normalized : fallback;
}

function cleanIdentifier(value: string | undefined) {
  return String(value || '').trim().replace(/[^a-zA-Z0-9_:-]/g, '').slice(0, 120);
}

function cleanProofRunId(value: string) {
  const normalized = String(value || '').trim();
  return /^wpno-tier4-[A-Za-z0-9._:-]+$/.test(normalized) ? normalized.slice(0, 180) : '';
}

function redactProviderError(message: string) {
  return message.replace(/sk-ant-[a-zA-Z0-9_-]+/g, 'sk-ant-[redacted]');
}
