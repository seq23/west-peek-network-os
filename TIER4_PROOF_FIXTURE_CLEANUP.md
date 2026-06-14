# Tier 4 Proof Fixture Cleanup

## Authority

Tier 4 data may be physically deleted only through the authenticated cleanup endpoint and the supported package commands below.

| Command | Scope | Destructive |
|---|---|---|
| `npm run tier4:cleanup:latest:preview` | Latest recorded Tier 4 run | No |
| `npm run tier4:cleanup:latest` | Latest recorded Tier 4 run | Yes |
| `npm run tier4:cleanup:preview -- wpno-tier4-<run-id>` | One exact run | No |
| `npm run tier4:cleanup -- wpno-tier4-<run-id>` | One exact run | Yes |
| `npm run tier4:cleanup:historical:preview` | All registered Tier 4 fixtures | No |
| `npm run tier4:cleanup:historical` | All registered Tier 4 fixtures | Yes |

## Historical cleanup contract

Historical cleanup exists for cases where the operator no longer knows individual run IDs.

A row is eligible only when all of these are true:

1. `proof_fixture` is exactly true.
2. `proof_run_id` matches the canonical `wpno-tier4-*` pattern.
3. `proof_test_id` is nonempty.
4. The row contains the tab's stable record ID.
5. The exact tuple `(record_id, proof_run_id, proof_test_id)` appears in the manifest returned by the immediately preceding preview.

Execution requires the confirmation token `DELETE_ALL_REGISTERED_TIER4_PROOF_FIXTURES` internally. The command supplies it only after collecting the exact preview manifest.

## Prohibited selection logic

Cleanup may never select records using:

- names;
- email addresses;
- companies;
- free-text labels;
- dates alone;
- broad string prefixes in business fields;
- partial matches;
- old test naming conventions without fixture metadata.

## Verification

After execution, the system must:

- reread every cleanup tab;
- confirm no selected fixture tuple remains;
- confirm no unrelated stable record ID changed;
- report matched, deleted, and remaining counts per tab;
- hard-fail if any registered Tier 4 fixture remains.

## Workbook reset boundary

The empty-workbook reset is not cleanup. It clears all governed data and rebuilds headers. Use it only when the workbook is intentionally disposable.

## MOST RECENT VS HISTORICAL

Use latest or exact-run cleanup when the run is known. Use historical cleanup only when the operator needs to remove all registered Tier 4 fixtures across multiple or unknown runs.

Successful historical execution must report `remaining_total: 0`.


## Physical blank-row compaction

Exact and historical fixture cleanup delete registered records with Google Sheets `deleteDimension`. Fully blank row shells cannot be attributed to a run because the values API returns no ownership metadata. They may be physically compacted only when the operator explicitly supplies this confirmation phrase:

`DELETE_PHYSICAL_BLANK_DATA_ROWS`

Run exact cleanup with physical compaction by setting:

`TIER4_PHYSICAL_DELETE_CONFIRM=DELETE_PHYSICAL_BLANK_DATA_ROWS`

The compaction pass preserves row 1 and every nonblank row, deletes only fully blank rows beneath the header, and reports `blank_rows_deleted` per governed tab. Without the exact phrase, compaction does not run.
