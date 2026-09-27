import { requireAuthenticatedUser, type AuthEnv } from '../../_shared/auth';
import { json, readJson } from '../../_shared/json';
import { appendRecord, readTab, sheetsUnavailable, type RuntimeEnv } from '../../_shared/sheets';
import { introRows } from '../../_shared/introductions';

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
    if (current.approval_type === 'introduction_email') {
      if (current.status !== 'pending') return json({ok:false,error:'This introduction approval was already decided.'},{status:409});
      if (String(current.assigned_to||'').toLowerCase()!==user.email.toLowerCase()) return json({ok:false,error:'The receiving-side relationship owner must decide this introduction.'},{status:403});
      const intro=(await introRows(env)).find((r)=>r.intro_id===current.source_entity_id);
      if (!intro || intro.status!=='pending_approval' || intro.approval_id!==id) return json({ok:false,error:'Introduction and approval states no longer match. Refresh before deciding.'},{status:409});
      const now=new Date().toISOString();
      const decided={...current,updated_at:now,status:body.decision==='approve'?'approved':'rejected',approved_by:body.decision==='approve'?user.email:'',approved_at:body.decision==='approve'?now:'',rejected_by:body.decision==='reject'?user.email:'',rejected_at:body.decision==='reject'?now:''};
      await appendRecord(env,'approvals',decided);
      const next={...intro,updated_at:now,status:body.decision==='approve'?'approved':'declined',approved_by:body.decision==='approve'?user.email:'',approved_at:body.decision==='approve'?now:'',decline_reason:body.decision==='reject'?'Rejected by receiving-side owner.':''};
      await appendRecord(env,'introductions',next);
      return json({ok:true,approval:decided,introduction:next,persistence:'google_sheets_append_only'});
    }
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
