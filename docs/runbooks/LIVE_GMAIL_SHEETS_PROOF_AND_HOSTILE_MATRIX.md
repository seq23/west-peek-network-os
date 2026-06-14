# Live Gmail + Google Sheets Proof and Hostile Regression Matrix

Status: REQUIRED RELEASE PROOF

## Live provider proof

`npm run test:e2e:live-gmail:real` now requires:

- `LIVE_GMAIL_TRIGGER_E2E=1`
- `WEST_PEEK_E2E_RUN_ID=wpno-tier4-...`
- `TIER4_GMAIL_SEED_ACCESS_TOKEN` with Gmail send scope, used only by the proof runner
- `TIER4_GMAIL_SEED_TO`, the connected mailbox under test
- authenticated Playwright storage state and deployed HTTPS base URL

For each supported alias, the test creates a unique Gmail message, records the Gmail message ID, runs deployed Gmail sync, verifies exact classification and exactly one pending-human-review `intake_queue` row, reruns sync to prove zero duplicate imports, reads back the exact row, previews exact-run cleanup, executes deletion using the preview IDs, then verifies the rows are gone while unrelated rows and schema fingerprints remain unchanged.

The production application retains Gmail readonly scope. The separate proof token prevents production permission expansion merely to seed test messages.

## Hostile regression proof

`npm run test:hostile-trigger-sheet-regressions` proves or enforces:

- swapped, missing, and extra headers fail closed;
- canonical headers with zero data rows remain valid;
- header deletion is a visible schema failure;
- Gmail OAuth and intake reads cannot bypass schema validation;
- all writes validate headers and require readback;
- all aliases classify correctly;
- HTML and forwarded-message text expose aliases;
- multiple aliases resolve deterministically to one intake intent;
- pagination and duplicate diagnostics remain present;
- cleanup remains fixture-owned, exact-ID locked, and unrelated-row preserving;
- fuzzy business-field cleanup is forbidden.

Live provider failure injection for append/readback failures remains part of the deployed provider lane. Container tests prove the fail-closed contract and error propagation; they do not claim live Google provider mutation.

## Completion boundary

The repository may be marked locally ready only after `npm run validate:trigger-sheet-proof`, schema-contract validation, cleanup-contract validation, typecheck, and build pass from the reopened artifact. It may not be marked provider-complete until the authenticated deployed five-alias proof runs successfully against the exact artifact hash. The live proof response must include `imported_records` with Gmail message ID, intake ID, trigger, intent, physical row number, and `readback_verified=true`, plus `sync_diagnostics` for query, duplicate, failure, and target-tab attribution.

The only admitted schema migration for the unused workbook is `npm run sheets:migrate-schema`, which identifies the authenticated destructive reset endpoint and schema-v1 confirmation phrase. Runtime requests never mutate or reorder headers.
