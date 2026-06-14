# West Peek Network OS — Trigger and Sheets Remediation

Status: STRUCTURALLY CHECKED — LOCAL VALIDATION REQUIRED

## Corrected

- Removed silent runtime header repair and replaced it with exact fail-closed schema validation.
- Added canonical machine-readable Sheets schema contract covering ten governed tabs.
- Added append readback verification and actionable Sheets error codes.
- Changed Gmail trigger search to independent alias queries with pagination and Gmail-ID deduplication.
- Replaced broad historical cleanup with dry-run-first, exact proof-run, exact proof-test, exact record-ID deletion.
- Removed historical and legacy physical-delete command surfaces.
- Added authenticated read-only Sheet doctor and explicit empty-workbook reset endpoint.
- Added trigger/Sheet safety tests and cleanup-contract validation.

## Container proof executed

- `npm ci --ignore-scripts`
- `npx tsc --noEmit`
- `npm run build`
- `npm run validate:sheets-schema-contract`
- `npm run test:trigger-sheet-safety`
- `npm run validate:tier4-cleanup-contract`

## Local/deployed proof still required

The local updater must apply this baseline and run the repo-authorized local prepush profile. Live credentials are required to reset the unused workbook, reconnect/read OAuth state, seed all five Gmail aliases, verify Google Sheets append/readback/dedupe, and prove exact-ID cleanup against the deployed runtime.

## Follow-up double/triple-check corrections

- Corrected reset sequencing so missing tabs are created before any clear or header-write call.
- Strengthened schema validation to compare every runtime header value and order against `_sheets_schema_contract.json`, rather than checking only that tab names appear in source.
- Strengthened trigger/Sheet safety testing to enforce create-first reset, exact proof ownership fields on every governed tab, independent paginated alias search, dedupe markers, fail-closed schema behavior, and prohibited historical cleanup patterns.
- Added `docs/runbooks/TRIGGER_SHEETS_INCIDENT_AND_REGRESSION_GUARD.md` and architectural decision `ADM-2026-06-14-TRIGGER-SHEETS-01`.


## OAuth/runtime read regression guard (2026-06-14)

All governed runtime reads, including OAuth status, approvals, notifications, and record lifecycle reads, must validate the live tab schema. `ensureHeaders: false` is forbidden in runtime API handlers. Read-only does not mean schema-optional: a misaligned header row can corrupt field interpretation without performing a write. The admitted hostile trigger/Sheets regression lane scans these handlers and hard-fails on any bypass.
