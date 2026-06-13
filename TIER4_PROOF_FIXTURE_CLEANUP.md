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
