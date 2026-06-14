# Cleanup Operations

## Supported Tier 4 cleanup lanes

### Latest completed run

Preview:

`npm run tier4:cleanup:latest:preview`

Execute:

`npm run tier4:cleanup:latest`

### Known exact run

Preview:

`npm run tier4:cleanup:preview -- wpno-tier4-<run-id>`

Execute:

`npm run tier4:cleanup -- wpno-tier4-<run-id>`

### All registered historical Tier 4 fixtures

Use this when the run ID is unknown or several old Tier 4 runs remain.

Preview first:

`npm run tier4:cleanup:historical:preview`

Then execute:

`npm run tier4:cleanup:historical`

Historical cleanup physically deletes only rows satisfying every condition:

- `proof_fixture=true`
- `proof_run_id` matches `wpno-tier4-*`
- `proof_test_id` is present
- the tab has a configured stable record ID and the row contains it
- the execution manifest exactly matches the immediately preceding preview

It never selects rows by contact name, founder name, email, company, labels, dates, arbitrary prefixes, or fuzzy text. After deletion it rereads each tab, verifies zero registered Tier 4 fixtures remain, and verifies unrelated stable record IDs did not change.

## Workbook reset is separate

`sheets:reset-empty-workbook` clears all governed workbook values, including non-test data and OAuth rows. It is not a Tier 4 cleanup command and should only be used for an intentionally empty workbook reset.

## Permanent Gmail ingestion evidence

Rows in `provider_replay_guard` whose `provider` is `gmail_ingestion_ledger`, `gmail_sync_watermark`, or `gmail_sync_cursor` are permanent production evidence. Exact-run, registered historical, and marker-based Tier 4 cleanup must preserve them. Cleanup may remove Tier 4-created Intake rows, but it must not remove the Gmail message-ID ledger or per-mailbox forward-only watermark.
