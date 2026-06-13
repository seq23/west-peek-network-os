# Artifact Manifest

- Current artifact name: `west-peek-network-os-main_BASELINE_06-13-26_e6a4c9b1.zip`
- Source ZIP: `west-peek-network-os-main_BASELINE_06-13-26_d9f541c2.zip`
- Repo root: `west-peek-network-os/`
- Repo: `west-peek-network-os`
- Branch contract: `main`
- Mode: full baseline snapshot
- Update authority: `~/update_repo_from_zip_generic_v3_1.sh`
- Repo contract: `_repo_update_contract.json`
- Secret mode: `vault_required`
- Validation matrix: CURRENT

## Changed files

- `scripts/_validation-utils.mjs`
- `scripts/validate-artifact-manifest-current.mjs`
- `scripts/validate-docs-match-package-scripts.mjs`
- `scripts/validate-tier-docs-current.mjs`
- `scripts/validate-tier4-docs-complete.mjs`
- `scripts/validate-docs-consolidation.mjs`
- `scripts/validate-final-tier-contract.mjs`
- `REPO_VALIDATION_MATRIX.md`
- `_repo_validation_matrix.json`
- `_validator_admission_register.json`
- `ARCHITECTURAL_DECISIONS.md`
- `ARTIFACT_MANIFEST.md`

## Generated artifacts excluded

- `.git/`
- `node_modules/`
- `dist/`
- `logs/`
- `reports/`
- `artifacts/diagnostics/`
- `playwright-report/`
- `test-results/`
- `coverage/`
- `.cache/`
- `.tmp/`
- `tsconfig.tsbuildinfo`

## Validation status

- Prior local updater run: 53 Playwright tests passed, 2 intentionally skipped.
- Deep Validation: PASSED.
- Build: PASSED.
- This revision changes documentation-validator severity and validator admission metadata only; no product runtime behavior changed.
- Documentation consolidation currently emits a non-blocking STRONG WARNING for three unmapped active documents.
- Current artifact packaging and structural checks: PASSED.

## Proof limits

- GitHub Actions: NOT PROVEN for this revision.
- Deployed Cloudflare runtime: NOT PROVEN for this revision.
- Live Gmail and Google Sheets: NOT PROVEN for this revision.
- Headed human visual review: NOT PROVEN for this revision.

## Major changed surfaces

- provider modes and fixture provider
- centralized intelligent-inbox classifier
- durable local Sheets adapter
- isolated test-auth provider
- provider architecture integration suite
- local Master Gauntlet
- diagnostics and fixture cleanup
- canonical composite commands
- master-plan/addendum/Hallmark governance
- Deep Validation orchestration

## Validation

- Typecheck: PASSED
- Production build: PASSED
- Existing `validate:all`: PASSED
- Provider architecture integration: PASSED
- Local Master Gauntlet: PASSED
- Deep Validation: PASSED WITH ENVIRONMENT GAP
- Browser execution: PRIOR LOCAL RUN 39 PASSED / 17 FAILED; grouped corrections implemented; corrected 55-test local lane requires Mac rerun
- Hallmark expert review: NOT RUN — owner reference bundle unavailable in sandbox
- Live providers/deployment/GitHub Actions: NOT PROVEN

## Packaging exclusions

- `.git/`
- `node_modules/`
- `dist/`
- `logs/`
- generated diagnostics/reports
- Playwright reports and test results

## Hostile-review amendments

- Added `tests/integration/mock-web-contracts.mjs`.
- Added `test:web-contracts:mocked` to `verify:fast` and Deep Validation transitively.
- Corrected postpush truth boundary: missing `POSTDEPLOY_BASE_URL` is INCOMPLETE, not PASSED.
- Corrected environment-doctor classification so non-browser configuration failures block Deep Validation.
- Browser installation is now opt-in through `PLAYWRIGHT_INSTALL_BROWSER=1`.

## Local Playwright remediation

- Corrected self-spawn host/port parity.
- Corrected fresh snapshot query interception and persistence readback.
- Opened manual Intake capture by default.
- Added explicit maintenance-dialog handling.
- Separated local fixture/browser proof from live-production specs.
- Added `LOCAL_PLAYWRIGHT_FAILURE_REMEDIATION_2026-06-13.md`.
