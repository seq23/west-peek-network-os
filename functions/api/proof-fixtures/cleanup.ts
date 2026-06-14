import { requireAuthenticatedUser, type AuthEnv } from '../../_shared/auth';
import { json, readJson } from '../../_shared/json';
import { appendRecord, deletePhysicalRows, readTab, readTabPhysicalRows, sheetsUnavailable, type RuntimeEnv, type SheetTab } from '../../_shared/sheets';

type Context = { request: Request; env: RuntimeEnv & AuthEnv };
type Body = { run_id?: string; scope?: 'exact_run' | 'historical'; mode?: 'append_only' | 'physical_delete'; confirm?: string; physical_delete_confirm?: string; dry_run?: boolean; tab?: string; limit?: number; verify_only?: boolean };

const CONFIRM = 'CLEAN_TIER4_PROOF_FIXTURES';
const HISTORICAL_CONFIRM = 'CLEAN_ALL_HISTORICAL_TIER4_FIXTURES';
const PHYSICAL_DELETE_CONFIRM = 'PHYSICALLY_DELETE_TIER4_PROOF_ROWS';
const TABS: SheetTab[] = ['contacts', 'intake_queue', 'relationship_touches', 'approvals', 'notifications', 'ai_suggestions', 'events', 'event_attendees', 'provider_replay_guard'];
const ID_KEYS: Partial<Record<SheetTab, string>> = {
  contacts: 'contact_id', intake_queue: 'intake_id', relationship_touches: 'touch_id', approvals: 'approval_id',
  notifications: 'notification_id', ai_suggestions: 'suggestion_id', events: 'event_id', event_attendees: 'event_attendee_id',
  provider_replay_guard: 'replay_id'
};
const DEFAULT_LIMIT = 15;
const MAX_LIMIT = 20;

export async function onRequestPost({ request, env }: Context) {
  try {
    const user = await requireAuthenticatedUser(request, env);
    const body = await readJson<Body>(request);
    const scope = body.scope === 'historical' ? 'historical' : 'exact_run';
    const mode = body.mode === 'physical_delete' ? 'physical_delete' : 'append_only';
    const runId = String(body.run_id || '').trim();
    if (scope === 'exact_run' && !/^wpno-tier4-[A-Za-z0-9._:-]+$/.test(runId)) return json({ ok: false, error: 'A valid wpno-tier4 run_id is required.' }, { status: 400 });
    const requiredConfirm = scope === 'historical' ? HISTORICAL_CONFIRM : CONFIRM;
    if (body.confirm !== requiredConfirm) return json({ ok: false, error: `confirm must equal ${requiredConfirm}.` }, { status: 400 });
    if (mode === 'physical_delete' && body.physical_delete_confirm !== PHYSICAL_DELETE_CONFIRM) {
      return json({ ok: false, error: `physical_delete_confirm must equal ${PHYSICAL_DELETE_CONFIRM}.` }, { status: 400 });
    }

    const requestedTab = String(body.tab || '').trim();
    if (!requestedTab || !TABS.includes(requestedTab as SheetTab)) {
      return json({ ok: false, error: `tab must be one of: ${TABS.join(', ')}` }, { status: 400 });
    }
    const tab = requestedTab as SheetTab;
    const limit = Math.min(MAX_LIMIT, Math.max(1, Number.isFinite(Number(body.limit)) ? Math.floor(Number(body.limit)) : DEFAULT_LIMIT));
    const idKey = ID_KEYS[tab];
    if (!idKey) return json({ ok: false, error: `No stable ID key configured for ${tab}.` }, { status: 500 });

    if (mode === 'physical_delete') {
      const physicalRows = await readTabPhysicalRows(env, tab);
      const active = physicalRows.filter(({ record }) =>
        scope === 'historical'
          ? isHistoricalTier4FixtureIncludingCleaned(record)
          : isTargetFixtureIncludingCleaned(record, runId)
      );
      const selected = body.verify_only ? [] : active.slice(0, limit);
      const ids = selected.map(({ record }) => String(record[idKey] || '')).filter(Boolean);
      const rowNumbers = selected.map(({ rowNumber }) => rowNumber);
      let cleaned = 0;

      if (!body.dry_run && !body.verify_only && rowNumbers.length) {
        const result = await deletePhysicalRows(env, tab, rowNumbers);
        cleaned = result.deleted;
      }

      const readback = await readTabPhysicalRows(env, tab);
      const remaining = readback.filter(({ record }) =>
        scope === 'historical'
          ? isHistoricalTier4FixtureIncludingCleaned(record)
          : isTargetFixtureIncludingCleaned(record, runId)
      ).length;

      return json({
        ok: true,
        run_id: scope === 'exact_run' ? runId : null,
        scope,
        mode,
        tab,
        dry_run: body.dry_run === true,
        verify_only: body.verify_only === true,
        matched: active.length,
        selected: selected.length,
        cleaned,
        remaining,
        has_more: remaining > 0,
        ids,
        row_numbers: rowNumbers,
        limit,
        cleanup_status: body.dry_run ? 'preview_only' : remaining === 0 ? 'physically_deleted_verified' : 'in_progress',
        execution_allowed: false
      });
    }

    const rows = await readTab(env, tab, { ensureHeaders: false });
    const latest = latestByStableId(rows, idKey);
    const active = latest.filter((row) => scope === 'historical' ? isHistoricalTier4Fixture(row) : isTargetFixture(row, runId));
    const selected = body.verify_only ? [] : active.slice(0, limit);
    const now = new Date().toISOString();
    const ids = selected.map((row) => String(row[idKey] || '')).filter(Boolean);

    let cleaned = 0;
    if (!body.dry_run && !body.verify_only) {
      for (const row of selected) {
        await appendRecord(env, tab, cleanupVersion(tab, row, scope === 'historical' ? `historical-tier4-${now}` : runId, user.email, now));
        cleaned += 1;
      }
    }

    let remaining = active.length;
    if (!body.dry_run && !body.verify_only) {
      const readback = await readTab(env, tab, { ensureHeaders: false });
      remaining = latestByStableId(readback, idKey).filter((row) => isTargetFixture(row, runId)).length;
    }

    return json({
      ok: true,
      run_id: scope === 'exact_run' ? runId : null,
      scope,
      mode,
      tab,
      dry_run: body.dry_run === true,
      verify_only: body.verify_only === true,
      matched: active.length,
      selected: selected.length,
      cleaned,
      remaining,
      has_more: remaining > 0,
      ids,
      limit,
      cleanup_status: body.dry_run ? 'preview_only' : remaining === 0 ? 'verified' : 'in_progress',
      execution_allowed: false
    });
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


function isTargetFixtureIncludingCleaned(row: Record<string, unknown>, runId: string) {
  const text = Object.values(row).map((value) => String(value || '')).join('\n');
  const explicit = String(row.proof_run_id || '') === runId && String(row.proof_fixture || '').toLowerCase() === 'true';
  const cleanupVersion = String(row.proof_cleanup_run_id || '') === runId;
  const legacyTier4 = text.includes(runId) && /tier[ _-]?4|wpno-tier4|pitch lab (profile|packet)|public event e2e/i.test(text);
  return explicit || cleanupVersion || legacyTier4;
}

function isHistoricalTier4FixtureIncludingCleaned(row: Record<string, unknown>) {
  const proofRunId = String(row.proof_run_id || '').trim();
  const cleanupRunId = String(row.proof_cleanup_run_id || '').trim();
  const explicitProof = String(row.proof_fixture || '').toLowerCase() === 'true'
    && (/^wpno-tier4-/i.test(proofRunId) || /^historical-tier4-/i.test(proofRunId));
  if (explicitProof || /^wpno-tier4-/i.test(cleanupRunId) || /^historical-tier4-/i.test(cleanupRunId)) return true;
  const text = Object.values(row).map((value) => String(value || '')).join('\n');
  return /(?:wpno-tier4-|tier4-provider-|tier4-review-|tier4-event-|tier4-network-|tier4-founder-)/i.test(text)
    || /\bTier Four (?:Network Contact|Founder|Ventures|Network Co)\b/i.test(text)
    || /\bTier 4 (?:Proof|Review Proof|Event Guest|Event Capital|OCR proof|voice proof|voice diagnostic|direct OCR diagnostic)\b/i.test(text);
}


export function isHistoricalTier4Fixture(row: Record<string, unknown>) {
  if (String(row.proof_status || '') === 'proof_cleaned') return false;
  const proofRunId = String(row.proof_run_id || '').trim();
  const explicitProof = String(row.proof_fixture || '').toLowerCase() === 'true' && /^wpno-tier4-/i.test(proofRunId);
  if (explicitProof) return true;
  const text = Object.values(row).map((value) => String(value || '')).join('\n');
  return /(?:wpno-tier4-|tier4-provider-|tier4-review-|tier4-event-|tier4-network-|tier4-founder-)/i.test(text)
    || /\bTier Four (?:Network Contact|Founder|Ventures|Network Co)\b/i.test(text)
    || /\bTier 4 (?:Proof|Review Proof|Event Guest|Event Capital|OCR proof|voice proof|voice diagnostic|direct OCR diagnostic)\b/i.test(text);
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
