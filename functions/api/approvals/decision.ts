import { requireAuthenticatedUser, type AuthEnv } from '../../_shared/auth';
import { json, readJson } from '../../_shared/json';
import { appendRecord, readTab, sheetsUnavailable, type RuntimeEnv } from '../../_shared/sheets';

type Context = { request: Request; env: RuntimeEnv & AuthEnv };

export async function onRequestPost({ request, env }: Context) {
  try {
    const user = await requireAuthenticatedUser(request, env);
    const body = await readJson<{ approval_id?: string; decision?: 'approve' | 'reject' }>(request);
    const id = String(body.approval_id || '').trim();
    if (!id || !body.decision) return json({ ok: false, error: 'approval_id and decision are required.' }, { status: 400 });
    const rows = await readTab(env, 'approvals');
    const current = rows.filter((row) => String(row.approval_id || '') === id).sort((a, b) => stamp(b) - stamp(a))[0];
    if (!current) return json({ ok: false, error: 'Approval not found.' }, { status: 404 });
    const now = new Date().toISOString();
    const next = {
      ...current,
      approval_id: id,
      updated_at: now,
      status: body.decision === 'approve' ? 'approved' : 'rejected',
      approved_by: body.decision === 'approve' ? user.email : String(current.approved_by || ''),
      approved_at: body.decision === 'approve' ? now : String(current.approved_at || ''),
      rejected_by: body.decision === 'reject' ? user.email : String(current.rejected_by || ''),
      rejected_at: body.decision === 'reject' ? now : String(current.rejected_at || '')
    };
    await appendRecord(env, 'approvals', next);
    return json({ ok: true, approval: next, persistence: 'google_sheets_append_only' });
  } catch (error) {
    return sheetsUnavailable(error);
  }
}

function stamp(row: Record<string, unknown>) {
  const parsed = Date.parse(String(row.updated_at || row.created_at || ''));
  return Number.isFinite(parsed) ? parsed : 0;
}
