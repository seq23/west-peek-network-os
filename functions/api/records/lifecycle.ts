import { requireAuthenticatedUser, type AuthEnv } from '../../_shared/auth';
import { json, readJson } from '../../_shared/json';
import { appendRecord, readTab, sheetsUnavailable, type RuntimeEnv, type SheetTab } from '../../_shared/sheets';

type Context = { request: Request; env: RuntimeEnv & AuthEnv };
type Entity = 'intake' | 'touch' | 'approval' | 'notification' | 'ai_suggestion' | 'event_attendee';
type Body = { entity?: Entity; id?: string; action?: 'archive' | 'restore'; reason?: string };

const CONFIG: Record<Entity, { tab: SheetTab; idKey: string; archive: Record<string, unknown>; restore: Record<string, unknown> }> = {
  intake: { tab: 'intake_queue', idKey: 'intake_id', archive: { review_status: 'archived', execution_allowed: 'false' }, restore: { review_status: 'pending_human_review', execution_allowed: 'false' } },
  touch: { tab: 'relationship_touches', idKey: 'touch_id', archive: { status: 'cancelled', fulfillment_status: 'cancelled', execution_allowed: 'false' }, restore: { status: 'planned', fulfillment_status: 'planned', execution_allowed: 'false' } },
  approval: { tab: 'approvals', idKey: 'approval_id', archive: { status: 'cancelled' }, restore: { status: 'pending' } },
  notification: { tab: 'notifications', idKey: 'notification_id', archive: { status: 'dismissed' }, restore: { status: 'unread' } },
  ai_suggestion: { tab: 'ai_suggestions', idKey: 'suggestion_id', archive: { status: 'dismissed' }, restore: { status: 'pending' } },
  event_attendee: { tab: 'event_attendees', idKey: 'event_attendee_id', archive: { review_status: 'archived' }, restore: { review_status: 'pending_human_review' } }
};

export async function onRequestPost({ request, env }: Context) {
  try {
    const user = await requireAuthenticatedUser(request, env);
    const body = await readJson<Body>(request);
    const entity = body.entity;
    const id = String(body.id || '').trim();
    const action = body.action;
    if (!entity || !CONFIG[entity] || !id || !['archive', 'restore'].includes(String(action || ''))) {
      return json({ ok: false, error: 'entity, id, and a valid action are required.' }, { status: 400 });
    }
    const config = CONFIG[entity];
    const rows = await readTab(env, config.tab);
    const matches = rows.filter((row) => String(row[config.idKey] || '') === id);
    const current = matches.sort((a, b) => stamp(b) - stamp(a))[0];
    if (!current) return json({ ok: false, error: `${entity} record not found.` }, { status: 404 });
    const now = new Date().toISOString();
    const next = {
      ...current,
      [config.idKey]: id,
      ...(action === 'archive' ? config.archive : config.restore),
      updated_at: now,
      updated_by: user.email,
      lifecycle_action: action,
      lifecycle_reason: String(body.reason || ''),
      lifecycle_at: now
    };
    await appendRecord(env, config.tab, next);
    return json({ ok: true, entity, id, action, record: next, persistence: 'google_sheets_append_only' });
  } catch (error) {
    return sheetsUnavailable(error);
  }
}

function stamp(row: Record<string, unknown>) {
  const parsed = Date.parse(String(row.updated_at || row.created_at || ''));
  return Number.isFinite(parsed) ? parsed : 0;
}
