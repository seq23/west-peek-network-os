import { requireAuthenticatedUser, type AuthEnv } from '../../_shared/auth';
import { json } from '../../_shared/json';
import { batchReadTabs, sheetsUnavailable, type RuntimeEnv, type SheetTab } from '../../_shared/sheets';

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

let snapshotCache: { userEmail: string; payload: unknown; expiresAt: number } | null = null;
const SNAPSHOT_CACHE_TTL_MS = 45_000;

export async function onRequestGet({ request, env }: Context) {
  try {
    const user = await requireAuthenticatedUser(request, env);
    const url = new URL(request.url);
    const forceFresh = url.searchParams.get('fresh') === '1';

    if (!forceFresh && snapshotCache && snapshotCache.userEmail === user.email && Date.now() < snapshotCache.expiresAt) {
      return json({ ...(snapshotCache.payload as Record<string, unknown>), source: 'google_sheets_batch_cache' }, { headers: { 'cache-control': 'private, max-age=30' } });
    }

    // One batchGet request replaces eight tab reads and avoids per-tab header reads.
    const raw = await batchReadTabs(env, TABS);
    const data = Object.fromEntries(TABS.map((tab) => [tab, latestById(raw[tab] || [], IDS[tab])]));
    const payload = { ok: true, persistence: 'google_sheets', source: 'google_sheets_batch', refreshed_at: new Date().toISOString(), user_email: user.email, data };
    snapshotCache = { userEmail: user.email, payload, expiresAt: Date.now() + SNAPSHOT_CACHE_TTL_MS };
    return json(payload, { headers: { 'cache-control': 'private, max-age=30' } });
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
