# Validator Admission Register

Every package script containing validate/test/smoke/audit/deploy/postdeploy/predeploy/proof is admitted in `_validator_admission_register.json`.

Static validators prove contracts. Browser/provider lanes prove behavior only when executed in the correct runtime. Tier 4 live proof is postdeploy only.

## Simplification pass — 2026-06-12

`validate:hostile-master-addendum` is archived as informational only. It was an exact-token audit that duplicated stronger validators and could block on wording drift. The active gates are `validate:predeploy:full`, `validate:postdeploy:strict`, `tier4:ultimate-live-proof`, and their targeted docs/matrix/Tier 4 contract validators.

## Authenticated browser-state vault admission — 2026-06-13

`validate:auth-state-vault` is an admitted security/recoverability contract. It verifies the external encrypted vault architecture and shared Tier 4/Hallmark wiring. It does not claim that a live session exists or remains valid.
