import { requireAuthenticatedUser, type AuthEnv } from '../../_shared/auth';
import { json } from '../../_shared/json';
import { readTab, sheetsUnavailable, type RuntimeEnv, type SheetTab } from '../../_shared/sheets';

type Env = RuntimeEnv & AuthEnv;
type Context = { request: Request; env: Env };

const TABS: SheetTab[] = ['contacts', 'intake_queue', 'relationship_touches', 'approvals', 'notifications', 'ai_suggestions', 'events', 'event_attendees'];
const IDS: Record<string, string> = {
  contacts: 'contact_id',
  intake_queue: 'intake_id',
  relationship_touches: 'touch_id',
  approvals: 'approval_id',
  notifications: 'notification_id',
  ai_suggestions: 'suggestion_id',
  events: 'event_id',
  event_attendees: 'event_attendee_id'
};

export async function onRequestGet({ request, env }: Context) {
  try {
    const user = await requireAuthenticatedUser(request, env);
    const entries = await Promise.all(TABS.map(async (tab) => [tab, latestById(await readTab(env, tab), IDS[tab])] as const));
    return json({ ok: true, persistence: 'google_sheets', refreshed_at: new Date().toISOString(), user_email: user.email, data: Object.fromEntries(entries) });
  } catch (error) {
    const detail = error instanceof Error ? error.message : 'Google Sheets snapshot unavailable.';
    if (detail.includes('Google Sheets')) return sheetsUnavailable(error);
    return json({ ok: false, error: detail }, { status: detail.includes('Authentication') ? 401 : 503 });
  }
}

function latestById(rows: Array<Record<string, unknown>>, idKey: string) {
  const byId = new Map<string, Record<string, unknown>>();
  for (const row of rows) {
    const id = String(row[idKey] || '').trim();
    if (!id) continue;
    const current = byId.get(id);
    if (!current || timestamp(row.updated_at || row.created_at) >= timestamp(current.updated_at || current.created_at)) byId.set(id, row);
  }
  return Array.from(byId.values()).sort((a, b) => timestamp(b.updated_at || b.created_at) - timestamp(a.updated_at || a.created_at));
}

function timestamp(value: unknown) {
  const parsed = Date.parse(String(value || ''));
  return Number.isFinite(parsed) ? parsed : 0;
}
