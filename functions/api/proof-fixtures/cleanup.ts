import { requireAuthenticatedUser, type AuthEnv } from '../../_shared/auth';
import { json, readJson } from '../../_shared/json';
import { deletePhysicalRows, readTabPhysicalRows, sheetsUnavailable, type RuntimeEnv, type SheetTab } from '../../_shared/sheets';

type Context = { request: Request; env: RuntimeEnv & AuthEnv };
type ExpectedFixture = { record_id?: string; proof_run_id?: string; proof_test_id?: string };
type Body = {
  scope?: 'exact_run' | 'all_registered_tier4';
  run_id?: string;
  tab?: string;
  dry_run?: boolean;
  execute_confirm?: string;
  expected_ids?: string[];
  expected_fixtures?: ExpectedFixture[];
};

const EXACT_CONFIRM = 'DELETE_EXACT_REGISTERED_PROOF_FIXTURES';
const HISTORICAL_CONFIRM = 'DELETE_ALL_REGISTERED_TIER4_PROOF_FIXTURES';
const TIER4_RUN_PATTERN = /^wpno-tier4-[A-Za-z0-9._:-]+$/;
const TABS: SheetTab[] = ['contacts', 'intake_queue', 'relationship_touches', 'approvals', 'notifications', 'ai_suggestions', 'events', 'event_attendees', 'provider_replay_guard'];
const ID_KEYS: Partial<Record<SheetTab, string>> = {
  contacts: 'contact_id', intake_queue: 'intake_id', relationship_touches: 'touch_id', approvals: 'approval_id',
  notifications: 'notification_id', ai_suggestions: 'suggestion_id', events: 'event_id', event_attendees: 'event_attendee_id',
  provider_replay_guard: 'replay_id'
};

export async function onRequestPost({ request, env }: Context) {
  try {
    await requireAuthenticatedUser(request, env);
    const body = await readJson<Body>(request);
    const scope = body.scope === 'all_registered_tier4' ? 'all_registered_tier4' : 'exact_run';
    const runId = String(body.run_id || '').trim();
    const tab = String(body.tab || '').trim() as SheetTab;
    const dryRun = body.dry_run !== false;

    if (scope === 'exact_run' && !TIER4_RUN_PATTERN.test(runId)) {
      return json({ ok: false, error_code: 'CLEANUP_RUN_ID_INVALID', error: 'A valid exact wpno-tier4 run_id is required.' }, { status: 400 });
    }
    if (!TABS.includes(tab)) return json({ ok: false, error_code: 'CLEANUP_TAB_INVALID', error: `tab must be one of: ${TABS.join(', ')}` }, { status: 400 });
    const idKey = ID_KEYS[tab];
    if (!idKey) return json({ ok: false, error_code: 'CLEANUP_ID_KEY_MISSING', error: `No stable ID key configured for ${tab}.` }, { status: 500 });

    const physicalRows = await readTabPhysicalRows(env, tab);
    const owned = physicalRows.filter(({ record }) => scope === 'all_registered_tier4'
      ? isRegisteredTier4Fixture(record)
      : isExactOwnedFixture(record, runId));
    const proposed = owned.map(({ rowNumber, record }) => ({
      row_number: rowNumber,
      record_id: String(record[idKey] || '').trim(),
      proof_run_id: String(record.proof_run_id || '').trim(),
      proof_test_id: String(record.proof_test_id || '').trim()
    }));

    if (proposed.some((item) => !item.record_id || !item.proof_test_id || !TIER4_RUN_PATTERN.test(item.proof_run_id))) {
      return json({ ok: false, error_code: 'CLEANUP_FIXTURE_REGISTRY_INCOMPLETE', error: 'Every deletable fixture must have an exact stable record ID, valid wpno-tier4 proof_run_id, and proof_test_id.', proposed }, { status: 409 });
    }

    if (dryRun) {
      return json({ ok: true, mode: 'dry_run', scope, run_id: scope === 'exact_run' ? runId : null, tab, proposed, matched: proposed.length, deleted: 0, execution_allowed: false });
    }

    const requiredConfirm = scope === 'all_registered_tier4' ? HISTORICAL_CONFIRM : EXACT_CONFIRM;
    if (body.execute_confirm !== requiredConfirm) {
      return json({ ok: false, error_code: 'CLEANUP_CONFIRMATION_REQUIRED', error: `execute_confirm must equal ${requiredConfirm}.` }, { status: 400 });
    }

    if (scope === 'all_registered_tier4') {
      const expected = normalizeManifest(body.expected_fixtures || []);
      const actual = normalizeManifest(proposed);
      if (!expected.length || JSON.stringify(expected) !== JSON.stringify(actual)) {
        return json({ ok: false, error_code: 'CLEANUP_EXPECTED_MANIFEST_MISMATCH', error: 'Historical execution requires the exact fixture manifest returned by the immediately preceding dry run.', expected_fixtures: expected, proposed_fixtures: actual }, { status: 409 });
      }
    } else {
      const expectedIds = [...new Set((body.expected_ids || []).map((value) => String(value).trim()).filter(Boolean))].sort();
      const proposedIds = proposed.map((item) => item.record_id).sort();
      if (!expectedIds.length || JSON.stringify(expectedIds) !== JSON.stringify(proposedIds)) {
        return json({ ok: false, error_code: 'CLEANUP_EXPECTED_IDS_MISMATCH', error: 'Execution requires the exact record IDs returned by the immediately preceding dry run.', expected_ids: expectedIds, proposed_ids: proposedIds }, { status: 409 });
      }
    }

    const selectedKeys = new Set(proposed.map(fixtureKey));
    const beforeUnrelated = physicalRows
      .filter(({ record }) => !selectedKeys.has(recordFixtureKey(record, idKey)))
      .map(({ record }) => String(record[idKey] || '')).filter(Boolean).sort();
    const result = await deletePhysicalRows(env, tab, proposed.map((item) => item.row_number));
    const readback = await readTabPhysicalRows(env, tab);
    const remaining = readback.filter(({ record }) => selectedKeys.has(recordFixtureKey(record, idKey)));
    const afterUnrelated = readback
      .filter(({ record }) => !selectedKeys.has(recordFixtureKey(record, idKey)))
      .map(({ record }) => String(record[idKey] || '')).filter(Boolean).sort();

    if (remaining.length) return json({ ok: false, error_code: 'CLEANUP_PARTIAL', error: 'Registered fixture cleanup left selected rows behind.', remaining }, { status: 500 });
    if (JSON.stringify(beforeUnrelated) !== JSON.stringify(afterUnrelated)) {
      return json({ ok: false, error_code: 'CLEANUP_UNRELATED_ROW_CHANGED', error: 'Cleanup changed unrelated rows; operation is unsafe.' }, { status: 500 });
    }

    return json({ ok: true, mode: 'execute', scope, run_id: scope === 'exact_run' ? runId : null, tab, deleted: result.deleted, deleted_fixtures: normalizeManifest(proposed), remaining: 0, unrelated_rows_preserved: true, execution_allowed: false });
  } catch (error) {
    if (error instanceof Error && /SHEETS_|Google Sheets/.test(error.message)) return sheetsUnavailable(error);
    return json({ ok: false, error: error instanceof Error ? error.message : 'Fixture cleanup failed.' }, { status: 503 });
  }
}

function isExactOwnedFixture(record: Record<string, unknown>, runId: string) {
  return isRegisteredTier4Fixture(record) && String(record.proof_run_id || '') === runId;
}

function isRegisteredTier4Fixture(record: Record<string, unknown>) {
  return String(record.proof_fixture || '').toLowerCase() === 'true'
    && TIER4_RUN_PATTERN.test(String(record.proof_run_id || '').trim())
    && Boolean(String(record.proof_test_id || '').trim());
}

function normalizeManifest(items: ExpectedFixture[]) {
  return items.map((item) => ({
    record_id: String(item.record_id || '').trim(),
    proof_run_id: String(item.proof_run_id || '').trim(),
    proof_test_id: String(item.proof_test_id || '').trim()
  })).filter((item) => item.record_id && TIER4_RUN_PATTERN.test(item.proof_run_id) && item.proof_test_id)
    .sort((a, b) => fixtureKey(a).localeCompare(fixtureKey(b)));
}

function fixtureKey(item: ExpectedFixture) {
  return `${String(item.record_id || '').trim()}\u0000${String(item.proof_run_id || '').trim()}\u0000${String(item.proof_test_id || '').trim()}`;
}

function recordFixtureKey(record: Record<string, unknown>, idKey: string) {
  return fixtureKey({ record_id: String(record[idKey] || ''), proof_run_id: String(record.proof_run_id || ''), proof_test_id: String(record.proof_test_id || '') });
}
