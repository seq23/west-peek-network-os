import { requireAuthenticatedUser, type AuthEnv } from '../../_shared/auth';
import { json, readJson } from '../../_shared/json';
import { appendRecord, readTab, sheetsUnavailable, TAB_HEADERS, type RuntimeEnv } from '../../_shared/sheets';
import { projectKnownFields } from '../../_shared/recordProjection';
import { latestRecord } from '../../_shared/records';

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
    const current = latestRecord(matches);
    if (!current) return json({ ok: false, error: 'Contact not found.' }, { status: 404 });
    const now = new Date().toISOString();
    const next = projectKnownFields({
      ...current,
      contact_id: contactId,
      updated_at: now,
      status,
      updated_by: user.email,
      context_summary: String(current.context_summary || ''),
      tags: String(current.tags || '')
    }, TAB_HEADERS.contacts);
    await appendRecord(env, 'contacts', next);
    return json({ ok: true, contact: next, lifecycle_reason: String(body.reason || ''), persistence: 'google_sheets_append_only' });
  } catch (error) {
    return sheetsUnavailable(error);
  }
}
