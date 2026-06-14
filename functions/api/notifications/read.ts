import { requireAuthenticatedUser, type AuthEnv } from '../../_shared/auth';
import { json, readJson } from '../../_shared/json';
import { appendRecord, readTab, sheetsUnavailable, type RuntimeEnv } from '../../_shared/sheets';

type Context = { request: Request; env: RuntimeEnv & AuthEnv };

export async function onRequestPost({ request, env }: Context) {
  try {
    const user = await requireAuthenticatedUser(request, env);
    const body = await readJson<{ notification_id?: string; recipient_email?: string }>(request);
    const id = String(body.notification_id || '').trim();
    if (!id) return json({ ok: false, error: 'notification_id is required.' }, { status: 400 });
    const rows = await readTab(env, 'notifications');
    const current = rows.filter((row) => String(row.notification_id || '') === id).sort((a, b) => stamp(b) - stamp(a))[0];
    if (!current) return json({ ok: false, error: 'Notification not found.' }, { status: 404 });
    const now = new Date().toISOString();
    const next = { ...current, notification_id: id, updated_at: now, status: 'read', read_at: now, recipient_email: String(current.recipient_email || body.recipient_email || user.email) };
    await appendRecord(env, 'notifications', next);
    return json({ ok: true, notification: next, persistence: 'google_sheets_append_only' });
  } catch (error) {
    return sheetsUnavailable(error);
  }
}

function stamp(row: Record<string, unknown>) {
  const parsed = Date.parse(String(row.updated_at || row.created_at || ''));
  return Number.isFinite(parsed) ? parsed : 0;
}
