import { requireAuthenticatedUser, type AuthEnv } from '../../_shared/auth';
import { json, readJson } from '../../_shared/json';
import { appendRecord, readTab, sheetsUnavailable, type RuntimeEnv, type SheetTab } from '../../_shared/sheets';

type Context = { request: Request; env: RuntimeEnv & AuthEnv };
type Body = { run_id?: string; confirm?: string; dry_run?: boolean };

const CONFIRM = 'CLEAN_TIER4_PROOF_FIXTURES';
const TABS: SheetTab[] = ['contacts', 'intake_queue', 'relationship_touches', 'approvals', 'notifications', 'ai_suggestions', 'events', 'event_attendees', 'provider_replay_guard'];
const ID_KEYS: Partial<Record<SheetTab, string>> = {
  contacts: 'contact_id', intake_queue: 'intake_id', relationship_touches: 'touch_id', approvals: 'approval_id',
  notifications: 'notification_id', ai_suggestions: 'suggestion_id', events: 'event_id', event_attendees: 'event_attendee_id',
  provider_replay_guard: 'replay_id'
};

export async function onRequestPost({ request, env }: Context) {
  try {
    const user = await requireAuthenticatedUser(request, env);
    const body = await readJson<Body>(request);
    const runId = String(body.run_id || '').trim();
    if (!/^wpno-tier4-[A-Za-z0-9._:-]+$/.test(runId)) return json({ ok: false, error: 'A valid wpno-tier4 run_id is required.' }, { status: 400 });
    if (body.confirm !== CONFIRM) return json({ ok: false, error: `confirm must equal ${CONFIRM}.` }, { status: 400 });

    const now = new Date().toISOString();
    const matched: Record<string, number> = {};
    const cleaned: Record<string, number> = {};
    const ids: Record<string, string[]> = {};

    for (const tab of TABS) {
      const rows = await readTab(env, tab, { ensureHeaders: false });
      const latest = latestByStableId(rows, ID_KEYS[tab] || '');
      const candidates = latest.filter((row) => isTargetFixture(row, runId));
      matched[tab] = candidates.length;
      cleaned[tab] = 0;
      ids[tab] = [];
      for (const row of candidates) {
        const idKey = ID_KEYS[tab];
        if (!idKey || !row[idKey]) continue;
        ids[tab].push(String(row[idKey]));
        if (body.dry_run) continue;
        await appendRecord(env, tab, cleanupVersion(tab, row, runId, user.email, now));
        cleaned[tab] += 1;
      }
    }

    // Read back and prove no active matching fixture remains.
    const remaining: Record<string, number> = {};
    for (const tab of TABS) {
      const rows = await readTab(env, tab, { ensureHeaders: false });
      remaining[tab] = latestByStableId(rows, ID_KEYS[tab] || '').filter((row) => isTargetFixture(row, runId) && String(row.proof_status || '') !== 'proof_cleaned').length;
    }
    const remainingTotal = Object.values(remaining).reduce((sum, value) => sum + value, 0);
    return json({ ok: remainingTotal === 0 || body.dry_run === true, run_id: runId, dry_run: body.dry_run === true, matched, cleaned, remaining, ids, cleanup_status: body.dry_run ? 'preview_only' : remainingTotal === 0 ? 'verified' : 'incomplete', execution_allowed: false });
  } catch (error) {
    return sheetsUnavailable(error);
  }
}

function isTargetFixture(row: Record<string, unknown>, runId: string) {
  if (String(row.proof_status || '') === 'proof_cleaned') return false;
  const text = Object.values(row).map((value) => String(value || '')).join('\n');
  const explicit = String(row.proof_run_id || '') === runId && String(row.proof_fixture || '').toLowerCase() === 'true';
  const legacyTier4 = text.includes(runId) && /tier[ _-]?4|wpno-tier4|pitch lab (profile|packet)|public event e2e/i.test(text);
  return explicit || legacyTier4;
}

function cleanupVersion(tab: SheetTab, row: Record<string, unknown>, runId: string, userEmail: string, now: string) {
  const next: Record<string, unknown> = { ...row, updated_at: now, proof_run_id: runId, proof_fixture: true, proof_status: 'proof_cleaned', proof_cleaned_at: now, proof_cleanup_run_id: runId };
  if (tab === 'contacts') Object.assign(next, { status: 'archived', updated_by: userEmail });
  if (tab === 'intake_queue') Object.assign(next, { review_status: 'proof_cleaned', reviewed_by: userEmail, reviewed_at: now, execution_allowed: 'false' });
  if (tab === 'relationship_touches') Object.assign(next, { status: 'proof_cleaned', fulfillment_status: 'proof_cleaned', execution_allowed: 'false', updated_by: userEmail });
  if (tab === 'approvals') Object.assign(next, { status: 'proof_cleaned', rejected_by: userEmail, rejected_at: now });
  if (tab === 'notifications') Object.assign(next, { status: 'resolved', resolved_at: now });
  if (tab === 'ai_suggestions') Object.assign(next, { status: 'proof_cleaned', reviewed_by: userEmail, reviewed_at: now });
  if (tab === 'events') Object.assign(next, { status: 'revoked', public_form_enabled: 'false' });
  if (tab === 'event_attendees') Object.assign(next, { review_status: 'proof_cleaned' });
  if (tab === 'provider_replay_guard') Object.assign(next, { status: 'proof_cleaned' });
  return next;
}

function latestByStableId(rows: Array<Record<string, unknown>>, idKey: string) {
  if (!idKey) return rows;
  const map = new Map<string, Record<string, unknown>>();
  for (const row of rows) {
    const id = String(row[idKey] || '').trim();
    if (!id) continue;
    const current = map.get(id);
    if (!current || stamp(row) >= stamp(current)) map.set(id, row);
  }
  return Array.from(map.values());
}
function stamp(row: Record<string, unknown>) { const n = Date.parse(String(row.updated_at || row.created_at || '')); return Number.isFinite(n) ? n : 0; }
