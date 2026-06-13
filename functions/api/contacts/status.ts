import { requireAuthenticatedUser, type AuthEnv } from '../../_shared/auth';
import { json, readJson } from '../../_shared/json';
import { appendRecord, readTab, sheetsUnavailable, type RuntimeEnv } from '../../_shared/sheets';

type Context = { request: Request; env: RuntimeEnv & AuthEnv };
type Body = { contact_id?: string; status?: 'active' | 'archived'; reason?: string };

export async function onRequestPost({ request, env }: Context) {
  try {
    const user = await requireAuthenticatedUser(request, env);
    const body = await readJson<Body>(request);
    const contactId = String(body.contact_id || '').trim();
    const status = body.status === 'archived' ? 'archived' : body.status === 'active' ? 'active' : '';
    if (!contactId || !status) return json({ ok: false, error: 'contact_id and valid status are required.' }, { status: 400 });
    const rows = await readTab(env, 'contacts');
    const matches = rows.filter((row) => String(row.contact_id || '') === contactId);
    const current = matches.sort((a, b) => Date.parse(String(b.updated_at || b.created_at || '')) - Date.parse(String(a.updated_at || a.created_at || '')))[0];
    if (!current) return json({ ok: false, error: 'Contact not found.' }, { status: 404 });
    const now = new Date().toISOString();
    const next = { ...current, contact_id: contactId, updated_at: now, status, updated_by: user.email, context_summary: String(current.context_summary || ''), tags: String(current.tags || ''), source_detail: [String(current.source_detail || ''), body.reason ? `${status} reason: ${body.reason}` : ''].filter(Boolean).join(' | ') };
    await appendRecord(env, 'contacts', next);
    return json({ ok: true, contact: next, persistence: 'google_sheets_append_only' });
  } catch (error) {
    return sheetsUnavailable(error);
  }
}
