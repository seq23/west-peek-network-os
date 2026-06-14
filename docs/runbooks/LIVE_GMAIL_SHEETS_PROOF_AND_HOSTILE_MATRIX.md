# Live Gmail + Google Sheets Proof and Hostile Regression Matrix

Status: REQUIRED RELEASE PROOF

## Canonical seeding contract

`npm run test:e2e:live-gmail:real` supports two explicit modes:

### Manual seed — default

- `TIER4_GMAIL_SEED_MODE=manual`
- no Gmail send token
- operator sends exactly five messages using `docs/evidence/GMAIL_SEED_MESSAGE_GUIDE.md`
- all messages carry the exact `WEST_PEEK_E2E_RUN_ID`

### API seed — optional automation

- `TIER4_GMAIL_SEED_MODE=api`
- `TIER4_GMAIL_SEED_ACCESS_TOKEN` with Gmail send scope
- `TIER4_GMAIL_SEED_TO` equal to the connected mailbox

Production remains Gmail read-only in both modes. The API token is proof-runner-only.

## Required environment

- `LIVE_GMAIL_TRIGGER_E2E=1`
- `WEST_PEEK_E2E_RUN_ID=wpno-tier4-...`
- authenticated Playwright storage state
- deployed HTTPS base URL
- mode-specific inputs above

## Live provider proof

For each supported alias, the test verifies exact classification and exactly one pending-human-review `intake_queue` row, reruns sync to prove zero duplicate imports, reads back the exact row, previews exact-run cleanup, executes deletion using the preview IDs, then verifies the rows are gone while unrelated rows and schema fingerprints remain unchanged.

## Hostile regression proof

`npm run test:hostile-trigger-sheet-regressions` proves or enforces:

- swapped, missing, and extra headers fail closed;
- canonical headers with zero data rows remain valid;
- header deletion is a visible schema failure;
- Gmail OAuth, approvals, notifications, lifecycle, and intake reads cannot bypass schema validation;
- all writes validate headers and require readback;
- all aliases classify correctly;
- HTML and forwarded-message text expose aliases;
- multiple aliases resolve deterministically to one intake intent;
- pagination and duplicate diagnostics remain present;
- cleanup remains fixture-owned, exact-ID locked, and unrelated-row preserving;
- fuzzy business-field cleanup is forbidden.

## Completion boundary

The repository may not be marked provider-complete until the authenticated deployed five-alias proof runs successfully against the exact artifact hash. Manual and API seeding are equivalent only as input creation methods; both must traverse the same deployed Gmail read, Sheet mutation/readback, dedupe, and cleanup path.
