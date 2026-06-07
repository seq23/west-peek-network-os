import { requireAuthenticatedUser, type AuthEnv } from '../../_shared/auth';
import { json, readJson } from '../../_shared/json';
import { appendRecord, sheetsUnavailable, type RuntimeEnv } from '../../_shared/sheets';

type Context = { request: Request; env: RuntimeEnv & AuthEnv };

export async function onRequestPost({ request, env }: Context) {
  let user: { email: string };
  try {
    user = await requireAuthenticatedUser(request, env);
  } catch (error) {
    return json({ ok: false, error: error instanceof Error ? error.message : 'Authentication required.' }, { status: 401 });
  }
  const body = await readJson<{ approval_id?: string; decision?: 'approve' | 'reject'; actor?: string; approval_type?: string; source_entity_id?: string }>(request);
  if (!body.approval_id || !body.decision) return json({ ok: false, error: 'approval_id and decision are required.' }, { status: 400 });
  const now = new Date().toISOString();
  const approval = {
    approval_id: body.approval_id,
    created_at: now,
    updated_at: now,
    approval_type: body.approval_type || 'relationship_touch',
    source_entity_type: 'approval_decision',
    source_entity_id: body.source_entity_id || body.approval_id,
    requested_by: body.actor || user.email,
    assigned_to: body.actor || user.email,
    relationship_owner: body.actor || user.email,
    status: body.decision === 'approve' ? 'approved' : 'rejected',
    risk_level: 'medium',
    suggested_payload: `Runtime approval decision recorded for ${body.approval_id}`,
    approved_by: body.decision === 'approve' ? body.actor || user.email : '',
    approved_at: body.decision === 'approve' ? now : '',
    rejected_by: body.decision === 'reject' ? body.actor || user.email : '',
    rejected_at: body.decision === 'reject' ? now : ''
  };
  try {
    await appendRecord(env, 'approvals', approval);
  } catch (error) {
    return sheetsUnavailable(error);
  }
  return json({ ok: true, approval, persistence: 'google_sheets' });
}
