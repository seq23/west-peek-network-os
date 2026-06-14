# Tier 4 and Test-Data Cleanup Operations

Status: ACTIVE

## Purpose

This repository has several cleanup mechanisms. They solve different problems and must not be treated as interchangeable.

## Cleanup inventory

| Cleanup path | Purpose | Scope | Production writes | Normal operator use |
|---|---|---|---|---|
| `tier4:cleanup:preview` | Preview one known Tier 4 run | Exact `wpno-tier4-*` run ID | No | After every new Tier 4 proof |
| `tier4:cleanup` | Clean one known Tier 4 run | Exact `wpno-tier4-*` run ID | Yes | Required after every new Tier 4 proof |
| Settings → Tier 4 test-data cleanup | Browser alternative to exact-run cleanup | Exact `wpno-tier4-*` run ID | Yes | Optional operator path |
| `tier4:cleanup:historical:preview` | Discover all active legacy Tier 4 fixtures | Strong historical Tier 4 markers across all cleanup tabs | No | One-time recovery/audit operation |
| `tier4:cleanup:historical` | Clean all active legacy Tier 4 fixtures | Strong historical Tier 4 markers across all cleanup tabs | Yes | One-time recovery/audit operation |
| `tier4:physical-delete:preview` | Preview physical removal for one exact Tier 4 run | All physical rows carrying the exact run marker, including cleanup versions | No | Exceptional terminal-only operation |
| `tier4:physical-delete` | Physically remove one exact Tier 4 run | All physical rows carrying the exact run marker, including cleanup versions | Yes — destructive | Exceptional terminal-only operation after evidence preservation |
| `fixtures:cleanup:expired` | Update the local proof-fixture ledger | Expired local-adapter ledger rows only | No live-provider cleanup | Local fixture bookkeeping |
| UI archive/restore/dismiss/revoke controls | Manage ordinary operator records | One selected business record | Yes | Daily product operation |

## Exact-run cleanup

Tier 4 writes real proof records to the production Google Sheet. Every new proof run must have one pinned run ID and must be cleaned with that exact ID after evidence is preserved.

Safety controls:

- authenticated Playwright storage state is required
- run ID must match `wpno-tier4-*`
- fixed confirmation phrase: `CLEAN_TIER4_PROOF_FIXTURES`
- one Sheet tab per request
- maximum 15 cleanup versions per request
- append-only terminal versions; physical row deletion is not used
- fresh readback across all nine cleanup tabs
- no-progress abort prevents infinite loops
- reruns are idempotent because `proof_status=proof_cleaned` rows are ignored

Preview:

```bash
npm run tier4:cleanup:preview -- wpno-tier4-YYYYMMDDTHHMMSSZ
```

Execute and verify:

```bash
npm run tier4:cleanup -- wpno-tier4-YYYYMMDDTHHMMSSZ
```

Successful completion ends with:

```text
TIER 4 PRODUCTION FIXTURE CLEANUP VERIFIED
```

## Historical Tier 4 sweep

Historical sweep exists for legacy proof data created before exact-run cleanup was consistently completed. It is terminal-only because its scope is broader than one run and should not be a casual Settings action.

It matches only strong Tier 4 signatures:

- explicit `proof_fixture=true` with a `proof_run_id` beginning `wpno-tier4-`
- values containing `wpno-tier4-`
- values containing `tier4-provider-`, `tier4-review-`, `tier4-event-`, `tier4-network-`, or `tier4-founder-`
- narrow legacy labels such as `Tier 4 Review Proof`, `Tier 4 Event Guest`, `Tier 4 OCR proof`, and `Tier Four Network Contact`

It does **not** match generic terms such as founder, Gmail, Pitch Lab, event, review, proof, intake, or deal flow by themselves. Real records such as ordinary founder emails, genuine Pitch Lab submissions, and real event attendees are preserved unless they contain a strong Tier 4 marker.

Preview all historical matches:

```bash
npm run tier4:cleanup:historical:preview
```

Review the per-tab counts before execution. Then run:

```bash
npm run tier4:cleanup:historical
```

Successful completion ends with:

```text
HISTORICAL TIER 4 PRODUCTION FIXTURE CLEANUP VERIFIED
```

The historical sweep uses a separate confirmation phrase:

```text
CLEAN_ALL_HISTORICAL_TIER4_FIXTURES
```

This prevents the exact-run browser flow from accidentally invoking broad cleanup.

## What cleanup changes

Google Sheets remains append-only. Cleanup writes a new terminal version using the same stable entity ID.

- contacts → archived
- intake queue → `review_status=proof_cleaned`
- relationship touches → `status=proof_cleaned`
- approvals → `status=proof_cleaned`
- notifications → resolved
- AI suggestions → `status=proof_cleaned`
- events → revoked and public form disabled
- event attendees → `review_status=proof_cleaned`
- provider replay guard → `status=proof_cleaned`

Every cleanup version receives `proof_status=proof_cleaned` and `proof_cleaned_at`. Active snapshots filter those versions, so the records disappear from normal app views after refresh.

## Guarded physical deletion

Append-only cleanup remains the default normal lifecycle behavior.

Physical deletion is a separate, exceptional exact-run operation. It is not invoked by release:cleanup, release:close-lifecycle, Settings, or historical cleanup.

Safety controls:

- exact wpno-tier4-* run ID required
- authenticated Playwright storage state required
- normal exact-run confirmation phrase required
- second destructive confirmation phrase: PHYSICALLY_DELETE_TIER4_PROOF_ROWS
- terminal-only; no browser button
- one tab per request
- maximum 15 physical rows per request
- original proof rows and proof_cleaned terminal versions are matched
- rows are deleted in descending order to prevent index drift
- fresh physical-row readback covers all nine cleanup tabs
- no-progress abort prevents infinite loops
- success requires remaining_total: 0

Preview:

    npm run tier4:physical-delete:preview -- wpno-tier4-YYYYMMDDTHHMMSSZ

Execute only after preserving evidence and reviewing preview counts:

    npm run tier4:physical-delete -- wpno-tier4-YYYYMMDDTHHMMSSZ

Successful completion ends with:

    TIER 4 PHYSICAL ROW DELETION VERIFIED

Physical deletion is irreversible. It must never use fuzzy customer-name matching or target ordinary production records.

## What cleanup does not do

The normal append-only cleanup path:

- does not physically delete Google Sheet history
- does not delete Gmail messages
- does not remove legitimate production records without a Tier 4 marker
- does not replace ordinary UI archive/dismiss/revoke workflows
- does not clean local `.auth/` state
- does not clean the local fixture ledger unless `fixtures:cleanup:expired` is run
- does not prove the UI is visually correct after cleanup; authenticated refresh/Hallmark remains separate proof

## Required lifecycle for future Tier 4 runs

1. Generate one unique `WEST_PEEK_E2E_RUN_ID`.
2. Seed only the provider inputs required for that run.
3. Run Tier 4 live proof.
4. Preserve the Tier 4 report and diagnostics.
5. Preview cleanup for the exact run ID.
6. Execute exact-run cleanup.
7. Require verified zero remaining across all nine tabs.
8. Refresh the deployed app.
9. Run final authenticated Hallmark or targeted postdeploy browser proof.

Historical sweep is not the normal lifecycle. It is a recovery tool for legacy residue.

## Failure handling

- `401` or auth-state failure: restore/refresh authenticated state; do not weaken auth
- `503 Too many subrequests`: endpoint or caller is not using bounded per-tab batches; do not retry an unbounded implementation
- no-progress error: stop; inspect the returned tab and provider error
- nonzero final readback: cleanup is incomplete and must not be declared successful
- uncertain match: do not broaden fuzzy matching; inspect the row and add a narrow, reviewable marker only if it is unquestionably test data

## Proof boundary

A successful cleanup command proves production Google Sheets terminal versions were written and fresh readback found zero active matching fixtures. It does not prove every ordinary record lifecycle action, every app page, or visual quality.

## Verified cleanup

Both exact-run and historical cleanup require fresh readback and zero remaining matches before success.

# OPERATOR QUICK PATH — MOST RECENT VS HISTORICAL

## A. Clean the most recent Tier 4 proof run

Use this after the newest `release:live-proof` run. The helper reads the exact `runId` from `reports/tier4/tier4-ultimate-live-proof.json`; it never guesses by date or deletes by a broad name match.

1. Preview only:

    npm run tier4:cleanup:latest:preview

2. Review the preview output and confirm it references the expected `wpno-tier4-*` run ID.

3. Execute exact cleanup:

    npm run tier4:cleanup:latest

4. Success requires fresh readback with zero active matches for that exact run. The script exits nonzero if the report is missing, the run ID is malformed, cleanup makes no progress, or leftovers remain.

Override the report path only when intentionally cleaning a different preserved report:

    TIER4_LATEST_REPORT=/absolute/path/to/tier4-ultimate-live-proof.json npm run tier4:cleanup:latest:preview

For lifecycle closure, `npm run release:close-lifecycle` carries one `WEST_PEEK_E2E_RUN_ID` through live proof and exact cleanup automatically.

## B. Clean one known Tier 4 run ID

Use this when the exact run ID is already known:

    npm run tier4:cleanup:preview -- wpno-tier4-YYYYMMDDTHHMMSSZ
    npm run tier4:cleanup -- wpno-tier4-YYYYMMDDTHHMMSSZ

This is the safest recovery path for a specific interrupted run.

## C. Clean historical Tier 4 fixtures

Historical cleanup is a separate, terminal-only recovery operation. It is not part of routine release closure and must never be substituted for exact-run cleanup.

1. Restore and validate authenticated browser state.
2. Preview all strong historical Tier 4 matches:

    npm run tier4:cleanup:historical:preview

3. Review counts by cleanup tab. The historical matcher is limited to strong Tier 4 signatures and does not delete ordinary customer rows.
4. Execute the historical sweep:

    npm run tier4:cleanup:historical

5. The runner processes bounded batches, aborts on no progress, preserves append-only lifecycle history, and performs fresh all-tab verification.
6. Success is only the explicit result `HISTORICAL TIER 4 PRODUCTION FIXTURE CLEANUP VERIFIED` with `remaining_total: 0`.

### Historical cleanup safety laws

- Run preview first.
- Use only the repo-owned script; do not create ad-hoc Sheets deletion commands.
- Never use fuzzy customer-name matching.
- Never expose historical cleanup as a browser button.
- Do not rerun Tier 4 merely to test cleanup; that creates a new cleanup obligation.
- If cleanup stalls, preserve diagnostics and repair the cleanup path before another execution.

