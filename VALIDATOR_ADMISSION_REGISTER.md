# Validator Admission Register

Every package script containing validate/test/smoke/audit/deploy/postdeploy/predeploy/proof is admitted in `_validator_admission_register.json`.

Static validators prove contracts. Browser/provider lanes prove behavior only when executed in the correct runtime. Tier 4 live proof is postdeploy only.

## Simplification pass — 2026-06-12

`validate:hostile-master-addendum` is archived as informational only. It was an exact-token audit that duplicated stronger validators and could block on wording drift. The active gates are `validate:predeploy:full`, `validate:postdeploy:strict`, `tier4:ultimate-live-proof`, and their targeted docs/matrix/Tier 4 contract validators.

## Authenticated browser-state vault admission — 2026-06-13

`validate:auth-state-vault` is an admitted security/recoverability contract. It verifies the external encrypted vault architecture and shared Tier 4/Hallmark wiring. It does not claim that a live session exists or remains valid.


## Trigger and Sheets Regression Admissions (2026-06-14)

The following production-risk validators are admitted as HARD FAIL gates:

- `test:hostile-trigger-sheet-regressions` — registered in `_validator_admission_register.json` and `_repo_validation_matrix.json`.
- `test:trigger-sheet-safety` — registered in `_validator_admission_register.json` and `_repo_validation_matrix.json`.
- `validate:sheets-schema-contract` — registered in `_validator_admission_register.json` and `_repo_validation_matrix.json`.
- `validate:trigger-sheet-proof` — registered in `_validator_admission_register.json` and `_repo_validation_matrix.json`.


## Gmail sync UI hostile coverage — 2026-06-14

No new package command was introduced. The change extends already admitted lanes:

- `test:e2e:maxdepth` / `test:e2e:container` — three-surface Gmail sync behavior, sequential approved-mailbox requests, partial failure isolation, malformed response handling, completion reporting, and rapid-repeat lock.
- `test:critical-ui-data-flow` — shared component placement, three-mailbox allowlist, server rejection of unapproved mailboxes, refresh-failure reporting, and narrow post-cleanup integrity.
- `validate:authenticated-usability-contract` — operator-visible wording, shared control presence, and approved-mailbox policy.

All three commands already exist in `_validator_admission_register.json` and `_repo_validation_matrix.json`; therefore no unregistered validator was added.
