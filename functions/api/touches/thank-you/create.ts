import { createThankYouDraft, type AnthropicEnv } from '../../../_shared/anthropic';
import { requireAuthenticatedUser, type AuthEnv } from '../../../_shared/auth';
import { json, readJson } from '../../../_shared/json';
import { appendRecord, sheetsUnavailable, type RuntimeEnv } from '../../../_shared/sheets';

type Env = RuntimeEnv & AnthropicEnv & AuthEnv;
type Context = { request: Request; env: Env };
type TraceStage = { stage: string; status: 'passed' | 'blocked' | 'failed'; detail: string };

type Body = {
  recipient_name?: string;
  recipient_email?: string;
  company?: string;
  reason?: string;
  from_name?: string;
  tone?: string;
  owner?: string;
  priority?: string;
  due_date?: string;
  contact_id?: string;
  proof_run_id?: string;
};

export async function onRequestPost({ request, env }: Context) {
  const traceId = `thank_you_trace_${Date.now()}_${crypto.randomUUID().slice(0, 8)}`;
  const trace: TraceStage[] = [];
  let user: { email: string; role: string };
  try {
    user = await requireAuthenticatedUser(request, env);
    trace.push({ stage: 'auth', status: 'passed', detail: `authenticated allowlisted operator ${user.email}` });
  } catch (error) {
    trace.push({ stage: 'auth', status: 'blocked', detail: 'missing or invalid signed West Peek session' });
    return json({ ok: false, error: error instanceof Error ? error.message : 'Authentication required.', trace_id: traceId, internal_data_trace: trace, human_review_required: true, execution_allowed: false }, { status: 401 });
  }

  let body: Body;
  try {
    body = await readJson<Body>(request);
    trace.push({ stage: 'request_parse', status: 'passed', detail: 'JSON body parsed' });
  } catch (error) {
    trace.push({ stage: 'request_parse', status: 'failed', detail: 'invalid JSON body' });
    return json({ ok: false, error: error instanceof Error ? error.message : 'Invalid request body.', trace_id: traceId, internal_data_trace: trace }, { status: 400 });
  }

  const recipientName = clean(body.recipient_name);
  const reason = clean(body.reason);
  if (!recipientName) return validationError(traceId, trace, 'recipient_name is required.');
  if (!reason) return validationError(traceId, trace, 'reason is required.');
  if (reason.length > 2500) return validationError(traceId, trace, 'reason must be 2,500 characters or fewer.');

  const now = new Date().toISOString();
  const proofRunId = cleanProofRunId(
    body.proof_run_id ||
    request.headers.get('x-west-peek-proof-run-id') ||
    ''
  );
  const proofMeta = proofRunId
    ? {
        proof_run_id: proofRunId,
        proof_fixture: true,
        proof_status: 'active',
        proof_created_at: now,
        proof_expires_at: new Date(
          Date.now() + 24 * 60 * 60 * 1000
        ).toISOString()
      }
    : {};

  try {
    const draft = await createThankYouDraft(env, {
      recipientName,
      company: clean(body.company),
      reason,
      fromName: clean(body.from_name) || 'West Peek',
      tone: clean(body.tone) || 'warm polished'
    });
    trace.push({ stage: 'claude_thank_you_draft', status: 'passed', detail: `Claude returned ${draft.confidence}-confidence thank-you draft` });

    const touch = {
      touch_id: `touch_${Date.now()}_${crypto.randomUUID().slice(0, 8)}`,
      created_at: now,
      updated_at: now,
      contact_id: clean(body.contact_id),
      contact_email: clean(body.recipient_email),
      recipient_name: recipientName,
      recipient_email: clean(body.recipient_email),
      company: clean(body.company),
      owner: normalizeOwner(body.owner),
      reason,
      priority: normalizePriority(body.priority),
      due_date: clean(body.due_date) || 'This week',
      status: 'pending_approval',
      method: 'virtual_thank_you_card',
      card_type: 'west_peek_virtual_thank_you',
      card_title: draft.card_title,
      draft_message: draft.card_message,
      email_subject: draft.email_subject,
      email_body: draft.email_body,
      approval_required: 'true',
      execution_allowed: 'false',
      internal_data_trace: JSON.stringify(trace),
      created_by: user.email,
      updated_by: user.email
    };

    Object.assign(touch, proofMeta);

    const approval = {
      approval_id: `approval_${Date.now()}_${crypto.randomUUID().slice(0, 8)}`,
      created_at: now,
      updated_at: now,
      approval_type: 'virtual_thank_you_card',
      source_entity_type: 'relationship_touch',
      source_entity_id: touch.touch_id,
      requested_by: user.email,
      assigned_to: touch.owner === 'Unassigned' ? 'Sequoia' : touch.owner,
      relationship_owner: touch.owner === 'Unassigned' ? 'Sequoia' : touch.owner,
      status: 'pending',
      risk_level: 'medium',
      suggested_payload: JSON.stringify({
        recipient_name: touch.recipient_name,
        recipient_email: touch.recipient_email,
        company: touch.company,
        reason: touch.reason,
        method: touch.method,
        card_title: touch.card_title,
        draft_message: touch.draft_message,
        human_review_required: true,
        execution_allowed: false,
        execution_status: 'not_executed'
      }),
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
      notification_type: 'approval_waiting',
      channel: 'in_app',
      subject: 'Thank-you touch needs approval',
      body_preview: `Review thank-you touch for ${recipientName}.`,
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

    await appendRecord(env, 'relationship_touches', touch);
    await appendRecord(env, 'approvals', approval);
    await appendRecord(env, 'notifications', notification);

    trace.push({
      stage: 'persistence',
      status: 'passed',
      detail: 'pending thank-you touch, linked approval, and unread notification appended'
    });
    trace.push({
      stage: 'execution_guardrail',
      status: 'passed',
      detail: 'no card, email, gift, payment, or vendor order sent automatically'
    });

    return json({
      ok: true,
      touch,
      approval,
      notification,
      draft,
      provider: 'anthropic',
      trace_id: traceId,
      internal_data_trace: trace,
      human_review_required: true,
      approval_required: true,
      execution_allowed: false,
      execution_status: 'not_executed',
      persistence: 'google_sheets'
    });
  } catch (error) {
    const detail = error instanceof Error ? redactProviderError(error.message) : 'Thank-you card creation failed.';
    if (detail.includes('Google Sheets')) return sheetsUnavailable(error);
    trace.push({ stage: 'runtime', status: 'failed', detail });
    return json({ ok: false, error: detail, trace_id: traceId, internal_data_trace: trace, human_review_required: true, execution_allowed: false, execution_status: 'not_executed' }, { status: 503 });
  }
}

function validationError(traceId: string, trace: TraceStage[], error: string) {
  trace.push({ stage: 'input_validation', status: 'blocked', detail: error });
  return json({ ok: false, error, trace_id: traceId, internal_data_trace: trace, human_review_required: true, execution_allowed: false }, { status: 400 });
}

function clean(value: unknown) {
  return String(value || '').trim();
}

function normalizeOwner(value: unknown) {
  const normalized = String(value || '').trim();
  if (normalized === 'Sequoia' || normalized === 'Scooter') return normalized;
  return 'Unassigned';
}

function normalizePriority(value: unknown) {
  const normalized = String(value || '').trim();
  if (normalized === 'Low' || normalized === 'High') return normalized;
  return 'Normal';
}

function cleanProofRunId(value: string) {
  const normalized = String(value || '').trim();
  return /^wpno-tier4-[A-Za-z0-9._:-]+$/.test(normalized)
    ? normalized.slice(0, 180)
    : '';
}

function redactProviderError(message: string) {
  return message.replace(/sk-ant-[a-zA-Z0-9_-]+/g, 'sk-ant-[redacted]');
}
