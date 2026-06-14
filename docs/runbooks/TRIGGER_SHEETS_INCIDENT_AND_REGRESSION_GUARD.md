# Trigger and Google Sheets Incident — Regression Guard

**Incident date:** 2026-06-14  
**Affected system:** West Peek Network OS  
**Severity:** SEV-1 product-path regression  
**Status:** Source repaired; local and deployed provider proof required

## What failed

Gmail hashtag capture appeared healthy in tests while the real Gmail-to-Google-Sheets path stopped producing records. The trigger aliases were present, but the tests primarily proved parsing, source-string presence, fixtures, and mocked requests. They did not prove a real Gmail message was discovered, persisted to the live workbook, read back under the correct headers, deduplicated, and safely cleaned up.

The Sheets runtime also contained unsafe schema behavior: when live headers differed from the hard-coded canonical order, row 1 could be rewritten without migrating the existing data beneath it. That could make OAuth token lookup, Gmail deduplication, reads, and writes interpret physical columns as the wrong fields.

A separate cleanup lane physically deleted rows and allowed broad historical matching. That was unacceptable because cleanup ownership was not restricted to exact registered proof fixtures.

## Root causes

1. **Validation theater:** green parser and fixture tests were treated as trigger proof.
2. **Conflicting schema authorities:** runtime and maintenance code used different header policies.
3. **Silent mutation:** header mismatch could trigger an in-place header rewrite rather than a hard stop.
4. **No mandatory append readback:** a successful API response could be treated as persistence success.
5. **Dangerous cleanup selection:** historical text and prefix matching could select rows without exact fixture ownership.
6. **Reset sequencing defect found during follow-up:** missing tabs were initially cleared/written before the add-sheet request executed.

## Permanent solution

- `_sheets_schema_contract.json` is the machine-readable schema authority for all governed tabs.
- Runtime headers must match that contract exactly; `validate:sheets-schema-contract` hard-fails on drift.
- Runtime code never repairs or reorders headers. Mismatch returns `SHEETS_SCHEMA_MISMATCH` and performs no write.
- Every append validates schema, maps by canonical header, appends, reads back the physical row, and verifies the unique ID.
- Workbook reset is explicit, authenticated, destructive, and create-first: missing tabs are created before clear/header writes.
- Gmail aliases are queried independently with pagination and deduplicated by Gmail message identity and ingestion key.
- Cleanup defaults to dry-run and requires exact `proof_fixture=true`, exact `proof_run_id`, non-empty `proof_test_id`, exact record IDs from the preceding dry run, and an explicit confirmation phrase.
- Cleanup verifies exact deletion, zero leftovers, and preservation of unrelated record IDs.
- Historical broad-delete modes and command surfaces are forbidden.

## Non-negotiable regression gates

The following commands must remain part of release validation:

- `npm run validate:sheets-schema-contract`
- `npm run test:trigger-sheet-safety`
- `npm run validate:tier4-cleanup-contract`
- `npm run release:prepush:container`
- `npm run release:prepush:local`

A release must fail if:

- runtime and schema-contract header arrays differ in value or order;
- silent header-repair code returns;
- reset touches a missing tab before creating it;
- append lacks row readback and unique-ID verification;
- Gmail aliases are collapsed into one unproven query without pagination;
- cleanup accepts names, prefixes, historical labels, fuzzy matching, or unregistered rows;
- cleanup can execute without an exact dry-run ID set;
- live provider proof is skipped while the product is described as trigger-complete.

## Required live proof before COMPLETE

For each alias—`#wpnetwork`, `#addtowestpeek`, `#westpeeknetwork`, `#wpdealflow`, and `#dealflow`—the deployed proof must:

1. create a uniquely identified Gmail message;
2. run the real authenticated Gmail sync;
3. prove the message was discovered;
4. prove the correct relationship or deal-flow classification;
5. prove exactly one `intake_queue` row was appended;
6. read back the row by exact intake ID and confirm field/header alignment;
7. rerun sync and prove zero duplicate rows;
8. register the row as a proof fixture;
9. run cleanup dry-run and verify only the exact row is selected;
10. execute cleanup and verify unrelated rows and headers remain unchanged.

No mock, fixture, source scan, successful toast, or HTTP 200 substitutes for this provider mutation/readback proof.

## Operator safety

- Never manually reorder or rename row-1 headers.
- Never run a cleanup operation without reviewing its dry-run output.
- Never restore historical broad-delete scripts.
- Never call the system complete until live Gmail-to-Sheets mutation, readback, dedupe, and cleanup proof pass against the exact deployed artifact.

## Historical Tier 4 cleanup amendment — 2026-06-14

The initial repair removed broad historical cleanup because the old implementation selected rows through fuzzy test names and prefixes. That removal created an operational gap: an operator may need to purge several old Tier 4 runs without knowing their IDs.

The supported replacement is `all_registered_tier4` cleanup. It is not fuzzy historical matching. It selects only explicitly registered proof fixtures with a valid `wpno-tier4-*` run ID, nonempty test ID, and stable record ID. Preview returns the exact deletion manifest; execution must submit that same manifest and the dedicated confirmation token. Unrelated rows are fingerprinted before and after deletion.

Regression rule: historical cleanup is allowed only when it remains fixture-owned, dry-run-first, exact-manifest-locked, and readback-verified.


## OAuth/runtime read regression guard (2026-06-14)

All governed runtime reads, including OAuth status, approvals, notifications, and record lifecycle reads, must validate the live tab schema. `ensureHeaders: false` is forbidden in runtime API handlers. Read-only does not mean schema-optional: a misaligned header row can corrupt field interpretation without performing a write. The admitted hostile trigger/Sheets regression lane scans these handlers and hard-fails on any bypass.
