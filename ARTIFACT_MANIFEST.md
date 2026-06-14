# Artifact Manifest

## Current baseline

- ZIP: `west-peek-network-os-main_BASELINE_06-13-26_ec2611ca.zip`
- Source ZIP: `west-peek-network-os-main_BASELINE_06-13-26_ec2611ca.zip`
- Repo root: `west-peek-network-os`
- Mode: full snapshot baseline

## Changed files

- `src/styles.css`
- `src/ui/App.tsx`
- `src/ui/Dashboard.tsx`
- `src/ui/AddPerson.tsx`
- `src/ui/CaptureStudio.tsx`
- `src/ui/Events.tsx`
- `src/ui/Instructions.tsx`
- `src/ui/ThankYouStudio.tsx`
- `tests/e2e/network-os.spec.ts`
- `tests/e2e/provider-failure-auth-mobile-edge.spec.ts`
- `HALLMARK_GLOBAL_ROUTE_REMEDIATION_2026-06-13.md`
- `ARCHITECTURAL_DECISIONS.md`

## Generated artifacts excluded

- `node_modules/`
- `dist/`
- `playwright-report/`
- `test-results/`
- `logs/`
- `reports/`
- `artifacts/diagnostics/`
- `tsconfig.tsbuildinfo`

## Validation status

- TypeScript: passed
- `validate:all`: passed
- `verify:fast`: passed
- production build: passed
- provider-independent integration: passed
- Playwright coverage admission: passed
- full Chromium execution: local validation required

## Proof limits

Not proven in sandbox:

- local Chromium rendering after Hallmark remediation
- deployed route rendering after this artifact is pushed
- live Gmail / Google Sheets
- cross-instance concurrency
- final authenticated Hallmark browser recapture

## Hallmark global route refinement artifact

- Baseline ZIP: `west-peek-network-os-main_BASELINE_06-13-26_ec2611ca.zip`
- Source ZIP: `west-peek-network-os-main_BASELINE_06-13-26_ec2611ca.zip`
- Repo root: `west-peek-network-os`
- Changed files: `src/ui/App.tsx`, `src/ui/Dashboard.tsx`, `src/styles.css`, `ARCHITECTURAL_DECISIONS.md`, `HALLMARK_GLOBAL_ROUTE_REFINEMENT_2026-06-13.md`, `ARTIFACT_MANIFEST.md`
- Generated artifacts excluded: `node_modules/`, `dist/`, `playwright-report/`, `test-results/`, `logs/`, `artifacts/`, `.auth/`, `tsconfig.tsbuildinfo`
- Validation status: sandbox-safe validators and production build passed; local Chromium validation required
- Proof limits: deployed visual rendering, authenticated Hallmark recapture, live providers, GitHub Actions, and Cloudflare runtime are not proven by this package


## Auth-state vault addition

This baseline adds external encrypted authenticated-state backup/restore plus shared Tier 4 and Hallmark wrappers. No decrypted storage state, cookies, or auth ciphertext are included in the baseline ZIP.


## Hostile auth-vault verification correction

- Corrected GPG passphrase handling to use file descriptor input rather than process arguments.
- Added Hallmark runner capability validation for `--storage-state`.
- Added non-secret Tier 4 provider-input preflight disclosure.
- Revalidated encrypted backup/delete/restore, Hallmark wrapper wiring, Tier 4 environment wiring, secret non-disclosure, shell syntax, TypeScript, secret scan, documentation parity, and validator admission.
- Authentication restoration serves both Hallmark and Tier 4; provider-specific Tier 4 inputs and Gmail seed messages remain independently required.


## First-run authenticated capture addition

- Baseline ZIP: `west-peek-network-os-main_BASELINE_06-13-26_ec2611ca.zip`
- Added `scripts/auth-state/capture.sh` and `npm run auth:capture`.
- Added explicit initial-capture and refresh workflow to vault and postdeploy runbooks.
- Extended the auth-state contract validator so backup/restore cannot be considered complete without a first-run capture path.
- Verified synthetic Playwright capture, overwrite refusal, session/domain/expiration validation, atomic install, file mode `0600`, shell syntax, TypeScript, vault contract, and package/documentation parity.
- The real Google OAuth interaction remains local operator proof.

## Tier 4 production fixture cleanup lifecycle

- Added authenticated guarded production cleanup endpoint: `functions/api/proof-fixtures/cleanup.ts`.
- Added `npm run tier4:cleanup:preview -- <run-id>` and `npm run tier4:cleanup -- <run-id>`.
- Added proof lifecycle columns to canonical Google Sheets schemas.
- Cleanup is exact-run, append-only, soft-terminal, and fresh-readback verified.
- Cleaned proof fixtures are excluded from application snapshots.
- Carried forward the deployed stale-browser-cache correction and scoped Gmail Tier 4 guardrail assertion.
- Added `TIER4_PROOF_FIXTURE_CLEANUP.md` and an executable cleanup contract validator.

Changed files:
- `package.json`
- `functions/_shared/sheets.ts`
- `functions/_shared/pitchLabIntake.ts`
- `functions/api/sheets/snapshot.ts`
- `functions/api/proof-fixtures/cleanup.ts`
- `src/services/sheetsClient.ts`
- `tests/e2e/live-gmail-trigger-ingestion.spec.ts`
- `tests/e2e/public-event-and-pitchlab.spec.ts`
- `scripts/auth-state/cleanup-tier4.sh`
- `scripts/testing/fixtures/cleanup-live-tier4.mjs`
- `scripts/validate-tier4-cleanup-contract.mjs`
- `scripts/validate-structure.mjs`
- `TIER4_PROOF_FIXTURE_CLEANUP.md`

Validation status:
- ZIP integrity: pending packaging
- JavaScript syntax: passed
- Shell syntax: passed
- TypeScript transpile syntax: passed
- cleanup contract validator: passed
- structure validator: passed
- full local dependency-backed validation: required through updater
- deployed cleanup behavior: required after updater deployment

## Hostile-reviewed bounded cleanup correction

- Replaced single-invocation production cleanup with one-tab bounded batches to stay below Cloudflare Worker subrequest limits.
- Added Settings preview, explicit confirmation, bounded execution, no-progress abort, and final all-tab zero-remaining verification.
- Added the same no-progress and explicit verification behavior to the terminal cleanup runner.
- Verified `npm run validate:all`, `npm run typecheck`, production build, cleanup contract, and validator admission in the artifact workspace.
- Deployed Cloudflare execution and real Google Sheets cleanup remain local postdeployment proof requirements.

## Current hostile-reviewed cleanup baseline

- ZIP: `west-peek-network-os-main_BASELINE_06-13-26_5a8249ca.zip`
- Repo root: `west-peek-network-os`
- Revision basis: deterministic source-tree digest (8 hex characters)
- Status: structurally checked; deployed cleanup validation required

## Authenticated hostile product audit remediation

- Source snapshot: `west-peek-network-os-main-0ccbb55.zip`
- Added authenticated append-only lifecycle controls for touchpoints, approval history, notifications, event attendees, and AI suggestions.
- Corrected approval-decision and notification-read routes to preserve original record fields.
- Batched Google Sheets maintenance normalization writes to avoid Cloudflare subrequest exhaustion.
- Added safe display normalization for HTML-like provider/user text and long-string overflow hardening.
- Added `AUTHENTICATED_HOSTILE_PRODUCT_AUDIT_2026-06-13.md`.
- Structural validation, TypeScript, production build, provider contracts, secret scan, and `validate:all` passed.
- Deployed authenticated click/persistence verification remains required.

## Historical Tier 4 cleanup sweep

- Source ZIP: `west-peek-network-os-main_BASELINE_06-13-26_a5f349d3.zip`
- Adds terminal-only preview and verified cleanup for all historical Tier 4 fixtures.
- Strong selectors preserve ordinary production records and reject generic fuzzy matching.
- Adds consolidated cleanup documentation and architectural decision memory.
- Validation: `validate:all`, TypeScript, and production build passed in the reopened working copy.
- Live production cleanup and postdeploy authenticated readback remain locally required after deployment.


## Authenticated Product Usability Addendum — 2026-06-13

This repository adopts `docs/REPO_MASTER_CONTRACT_ADDENDUM_AUTHENTICATED_PRODUCT_USABILITY_2026-06-13.md`. Route-complete authenticated usability, production-shaped rendering, control-to-persistence proof, refresh/re-entry, maintenance scale, post-cleanup audit, and route-complete Hallmark are distinct mandatory proof layers.


## Remediation baseline 2e9a8f45 — 2026-06-13

- Source: `west-peek-network-os-main_BASELINE_06-13-26_f70fd765.zip`
- Scope: authenticated product usability remediation and proof-closure architecture
- Key changes: duplicate navigation fix; canonical display normalization; production-shaped fixtures; route/control/lifecycle manifests; maintenance budget contract; authenticated postdeploy click-audit runner; route-complete Hallmark and final proof matrices; new governing addendum adoption.
- Validation: `npm run validate:all` PASS; TypeScript PASS; production build PASS; secret scan PASS; cleanup contract PASS; auth-state vault contract PASS.
- Not proven in artifact workspace: local updater apply/commit/push; GitHub Actions; Cloudflare deployment; restored production auth; historical cleanup execution; live route mutations/readback; post-cleanup route audit; expert Hallmark approval.
- Status: STRUCTURALLY CHECKED — LOCAL VALIDATION REQUIRED after packaging/reopen.

## Hostile verification update — 2026-06-13

- Added strict authenticated route/session/console/network/readback audit semantics.
- Corrected visible-control proof boundaries.
- Added deterministic latest-record selection for malformed timestamps.
- Added `tests/integration/latest-record.mjs`.
- Clean-room `npm ci`, `validate:all`, typecheck, build, and Deep Validation passed.
- Chromium/browser, deployed auth, GitHub Actions, Cloudflare, live providers, historical cleanup, and final Hallmark remain not proven in this environment.
