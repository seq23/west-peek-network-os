import { requireAuthenticatedUser, type AuthEnv } from '../../_shared/auth';
import { json, readJson } from '../../_shared/json';
import { appendRecord, readTab, sheetsUnavailable, type RuntimeEnv } from '../../_shared/sheets';

type Context = { request: Request; env: RuntimeEnv & AuthEnv };
type Body = { event_id?: string; action?: 'revoke' | 'restore' };

export async function onRequestPost({ request, env }: Context) {
  try {
    const user = await requireAuthenticatedUser(request, env);
    const body = await readJson<Body>(request);
    const eventId = String(body.event_id || '').trim();
    if (!eventId || !['revoke', 'restore'].includes(String(body.action || ''))) return json({ ok: false, error: 'event_id and action are required.' }, { status: 400 });
    const rows = await readTab(env, 'events');
    const matches = rows.filter((row) => String(row.event_id || '') === eventId);
    const current = matches.sort((a, b) => Date.parse(String(b.updated_at || b.created_at || '')) - Date.parse(String(a.updated_at || a.created_at || '')))[0];
    if (!current) return json({ ok: false, error: 'Event not found.' }, { status: 404 });
    const restore = body.action === 'restore';
    const next = { ...current, event_id: eventId, updated_at: new Date().toISOString(), updated_by: user.email, status: restore ? 'active' : 'closed', public_form_enabled: restore ? 'true' : 'false' };
    await appendRecord(env, 'events', next);
    return json({ ok: true, event: next, persistence: 'google_sheets_append_only' });
  } catch (error) {
    return sheetsUnavailable(error);
  }
}
