# Tier 4 Production Proof-Fixture Cleanup

Status: ACTIVE

## Purpose

Tier 4 writes real proof records to the production Google Sheet. Those records must be removed from normal app surfaces after proof completes without deleting history or risking unrelated production data.

## Safety model

- Cleanup requires an authenticated Playwright storage state.
- Cleanup accepts only an exact run ID matching `wpno-tier4-*`.
- The caller must send the fixed confirmation phrase `CLEAN_TIER4_PROOF_FIXTURES`.
- Matching is limited to records explicitly tagged as proof fixtures or legacy Tier 4 records containing the exact run ID plus a Tier 4 test marker.
- Google Sheets remains append-only. Cleanup appends a terminal version using the same stable entity ID.
- Cleaned rows receive `proof_status=proof_cleaned` and are excluded from application snapshots.
- Contacts are archived, events revoked, notifications resolved, and review/execution records terminally marked without sending, paying, ordering, or contacting anyone.
- The runner performs fresh provider readback and fails unless zero active fixtures remain for the exact run ID.

## Preview

Preview the exact production records that would be cleaned:

```bash
npm run tier4:cleanup:preview -- wpno-tier4-YYYYMMDDTHHMMSSZ
```

Preview never writes.

## Verified cleanup

```bash
npm run tier4:cleanup -- wpno-tier4-YYYYMMDDTHHMMSSZ
```

Successful completion ends with:

```text
TIER 4 PRODUCTION FIXTURE CLEANUP VERIFIED
```

## Required lifecycle

1. Run Tier 4 with one pinned `WEST_PEEK_E2E_RUN_ID`.
2. Preserve the Tier 4 report.
3. Run cleanup preview for that exact run ID.
4. Run verified cleanup for that exact run ID.
5. Refresh the deployed app and confirm proof records no longer appear.
6. Run the final authenticated Hallmark capture.

A new Tier 4 run creates a new run ID and requires its own cleanup. Never reuse a cleanup command with a guessed or partial ID.

## Settings control

Authenticated operators can use **Settings → Tier 4 test-data cleanup**. The operator must enter the exact run ID, preview matches, confirm cleanup, and wait for verified zero-remaining readback. The browser and terminal flows both use bounded per-tab batches and are safe to rerun after interruption.

## Hostile-review hardening

- Every mutation request is bounded to one Sheet tab and at most 15 fixture versions.
- Both browser and terminal flows stop if a batch reports active rows but writes zero cleanup versions, preventing infinite loops.
- Both flows perform explicit post-mutation verification requests for every canonical cleanup tab, including tabs that previewed zero records.
- Browser success is not displayed unless the final aggregate verification reports zero active fixtures for the exact run ID.
- Interrupted or partially completed cleanup is idempotent because latest rows already marked `proof_cleaned` are excluded from subsequent candidate sets.
