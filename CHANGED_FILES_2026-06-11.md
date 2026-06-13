# Changed Files — 2026-06-11

## Added
- `LIVE_PROVIDER_EVIDENCE_TEMPLATE.md`
- `POSTDEPLOY_REAL_PROVIDER_RUNBOOK.md`
- `REAL_PROVIDER_LANE_MATRIX.md`
- `SECRET_EXCEPTION_LEDGER.md`
- `SECURITY_MODEL.md`
- `TESTING_SEQUENCE.md`
- `USER_JOURNEY_TEST_MATRIX.md`
- `VALIDATION_RUN_SUMMARY_2026-06-11.md`
- `functions/_middleware.ts`
- `functions/api/gmail/sync.ts`
- `functions/api/provider/status.ts`
- `scripts/validate-provider-lanes.mjs`

## Modified
- `ARCHITECTURAL_DECISIONS.md`
- `E2E_REQUIRED_TEST_MATRIX.md`
- `KNOWN_EDGE_CASE_INVENTORY.md`
- `README.md`
- `REPO_IDENTITY.md`
- `REPO_PRODUCT_PROMISE_LEDGER.md`
- `REPO_VALIDATION_MATRIX.md`
- `VALIDATOR_ADMISSION_REGISTER.md`
- `_env_contract.json`
- `_hostile_master_addendum_crosscheck_config.json`
- `_repo_validation_matrix.json`
- `_validator_admission_register.json`
- `docs/archive/superseded/docs__security-model.md`
- `docs/archive/superseded/docs__west-peek-routing-aside.md`
- `docs/cumulative-build-spec.md`
- `docs/secrets-and-cloudflare.md`
- `functions/_shared/auth.ts`
- `functions/_shared/pitchLabIntake.ts`
- `functions/_shared/sheets.ts`
- `functions/_shared/tokens.ts`
- `functions/api/session.ts`
- `package.json`
- `scripts/check-no-plaintext-secrets.mjs`
- `scripts/sheets/maintain-google-sheet.mjs`
- `scripts/validate-structure.mjs`
- `secrets/README.md`
- `src/services/providerRegistry.ts`
- `src/ui/App.tsx`
- `tests/domain/workflows.mjs`
- `tests/e2e/live-gmail-trigger-ingestion.spec.ts`
- `tests/e2e/public-event-and-pitchlab.spec.ts`

## Deleted


## Tier Correction Patch — 2026-06-11

- `scripts/validate-everything.mjs` — Tier 3 now forces postdeploy + real-provider lane inclusion and fails on HARD-FAIL UNPROVEN lanes.
- `_repo_validation_matrix.json` — explicit tier/status cleanup; real provider lanes are Tier 3 HARD FAIL.
- `TESTING_SEQUENCE.md` — rewritten to define Tier 1 / Tier 2 / Tier 3 and remove Tier 4.
- `TIER_VALIDATION_MODEL.md` — added canonical tier model.
- `REPO_VALIDATION_MATRIX.md` — appended Tier 3 ultimate correction.
- `docs/ACTIVE_DOCS.md` and `docs/DOCS_CONSOLIDATION_MAP.md` — added newly active proof/runbook docs.

- Added `scripts/run-with-temp-env.mjs` for temporary `.env.local` restore/run/cleanup around local and final-tier test commands.
- Added `test:everything:*:with-env` package scripts.
- Updated `TERMINAL_RELEASE_RUNBOOK.md` and `TESTING_SEQUENCE.md` with predeploy/postdeploy temporary-env testing sequence.
