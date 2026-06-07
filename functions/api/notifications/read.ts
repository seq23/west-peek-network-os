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
  const body = await readJson<{ notification_id?: string; recipient_email?: string }>(request);
  if (!body.notification_id) return json({ ok: false, error: 'notification_id is required.' }, { status: 400 });
  const now = new Date().toISOString();
  const notification = {
    notification_id: body.notification_id,
    created_at: now,
    updated_at: now,
    recipient_email: body.recipient_email || '',
    notification_type: 'read_receipt',
    channel: 'in_app',
    subject: `Notification read: ${body.notification_id}`,
    body_preview: '',
    entity_type: 'notification',
    entity_id: body.notification_id,
    priority: 'Normal',
    status: 'read',
    sent_at: '',
    read_at: now,
    resolved_at: '',
    failure_reason: ''
  };
  try {
    await appendRecord(env, 'notifications', notification);
  } catch (error) {
    return sheetsUnavailable(error);
  }
  return json({ ok: true, notification_id: body.notification_id, status: 'read', read_at: now, persistence: 'google_sheets' });
}
