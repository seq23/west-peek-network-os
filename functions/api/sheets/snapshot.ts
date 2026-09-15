import { requireAuthenticatedUser, type AuthEnv } from '../../_shared/auth';
import { json } from '../../_shared/json';
import { batchReadTabs, sheetsUnavailable, type RuntimeEnv, type SheetTab } from '../../_shared/sheets';

type Env = RuntimeEnv & AuthEnv;
type Context = { request: Request; env: Env };

const BASE_TABS: SheetTab[] = ['contacts', 'intake_queue', 'relationship_touches', 'approvals', 'notifications', 'ai_suggestions', 'events', 'event_attendees'];
const PROOF_TABS: SheetTab[] = ['provider_replay_guard'];
const IDS: Record<string, string> = {
  contacts: 'contact_id',
  intake_queue: 'intake_id',
  relationship_touches: 'touch_id',
  approvals: 'approval_id',
  notifications: 'notification_id',
  ai_suggestions: 'suggestion_id',
  events: 'event_id',
  event_attendees: 'event_attendee_id',
  provider_replay_guard: 'replay_id'
};

let snapshotCache: { userEmail: string; includeProof: boolean; tabs: string; payload: unknown; expiresAt: number } | null = null;
const SNAPSHOT_CACHE_TTL_MS = 45_000;

export async function onRequestGet({ request, env }: Context) {
  try {
    const user = await requireAuthenticatedUser(request, env);
    const url = new URL(request.url);
    const forceFresh = url.searchParams.get('fresh') === '1';
    const includeProof = url.searchParams.get('include_proof') === '1';
    const allTabs = includeProof ? [...BASE_TABS, ...PROOF_TABS] : BASE_TABS;
    // ONLY THE TABS ASKED FOR. West Peek OS pulls this every 15 minutes for two tabs (contacts,
    // relationship_touches) and was being served all eight — every row of every tab parsed and
    // re-keyed inside one invocation. On 14 Sep 2026 that crossed the Free plan's CPU limit and
    // every pull answered 503 / error 1102 for two hours. A caller that names its tabs gets those
    // and pays for those; a caller that names none gets the whole snapshot as before. Unknown names
    // are refused rather than silently dropped.
    const asked = (url.searchParams.get('tabs') || '').split(',').map((t) => t.trim()).filter(Boolean);
    const unknown = asked.filter((t) => !allTabs.includes(t as SheetTab));
    if (unknown.length) return json({ ok: false, error: `Unknown tab(s): ${unknown.join(', ')}` }, { status: 400 });
    const tabs = asked.length ? allTabs.filter((t) => asked.includes(t)) : allTabs;
    // ONLY WHAT CHANGED SINCE. West Peek OS pulls the community every fifteen minutes; with 4,712
    // contacts the whole snapshot is several megabytes parsed on both sides to conclude "nothing
    // new" (15 Sep 2026: 107 ms of CPU per pull against a 10 ms budget). `since=<ISO>` keeps only
    // rows whose updated_at (or created_at) is at or after it; the response says it did.
    const sinceRaw = url.searchParams.get('since') || '';
    const since = sinceRaw && !Number.isNaN(Date.parse(sinceRaw)) ? new Date(sinceRaw).getTime() : null;
    if (sinceRaw && since === null) return json({ ok: false, error: `since is not a date: ${sinceRaw}` }, { status: 400 });
    const cacheKey = tabs.join(',') + (since !== null ? `|since=${since}` : '');

    if (!forceFresh && snapshotCache && snapshotCache.userEmail === user.email && snapshotCache.includeProof === includeProof && snapshotCache.tabs === cacheKey && Date.now() < snapshotCache.expiresAt) {
      return json({ ...(snapshotCache.payload as Record<string, unknown>), source: 'google_sheets_batch_cache', freshness_requested: false, cache_age_ms: Math.max(0, SNAPSHOT_CACHE_TTL_MS - (snapshotCache.expiresAt - Date.now())) }, { headers: { 'cache-control': 'private, no-store, max-age=0' } });
    }

    // One batchGet request replaces per-tab reads and avoids repeated header requests.
    const raw = await batchReadTabs(env, tabs);
    const changedSince = (row: Record<string, unknown>) => {
      if (since === null) return true;
      const stamp = Date.parse(String(row.updated_at || row.created_at || ''));
      // A row with no readable timestamp is kept: leaving it out would hide it for ever.
      return Number.isNaN(stamp) ? true : stamp >= since;
    };
    const totals: Record<string, number> = {};
    const data = Object.fromEntries(tabs.map((tab) => {
      const rows = latestById(raw[tab] || [], IDS[tab]).filter((row) => String(row.proof_status || '') !== 'proof_cleaned');
      totals[tab] = rows.length;
      return [tab, rows.filter(changedSince)];
    }));
    const payload = { ok: true, persistence: 'google_sheets', source: 'google_sheets_batch', freshness_requested: forceFresh, proof_data_included: includeProof, cache_age_ms: 0, refreshed_at: new Date().toISOString(), user_email: user.email, data, ...(since !== null ? { since: new Date(since).toISOString(), totals_before_since: totals } : {}) };
    snapshotCache = { userEmail: user.email, includeProof, tabs: cacheKey, payload, expiresAt: Date.now() + SNAPSHOT_CACHE_TTL_MS };
    return json(payload, { headers: { 'cache-control': 'private, no-store, max-age=0' } });
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
