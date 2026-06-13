# West Peek Network OS — Proof Completion Master Plan

**Date:** 2026-06-13  
**Status:** LOCKED · ACTIVE  
**Scope:** UX/data-integrity remediation, intelligent inbox, live providers, deployment, browser journeys, validation claims, and release evidence

## 1. Purpose

This document locks the remaining proof work and defines the exact boundary between structural assurance and real-life operational proof.

A passing validator may prove source shape, configuration, documentation, or buildability. It does not prove live Gmail behavior, Google Sheets persistence, Cloudflare runtime behavior, browser-visible journeys, or deployed concurrency unless the test actually exercises those systems and reads the result back.

No future release report may describe a structural or static check as real-life provider proof.

## 2. Locked Missing Proof Lanes

The following seven lanes are mandatory before the corresponding behavior may be described as proven in production.

### 2.1 Live Gmail classification accuracy

**Required evidence:**
- Real messages delivered to `info@westpeek.ventures` or a dedicated live test mailbox.
- Unique evidence ID in every seeded message.
- Classification result, score, matched positive signals, matched negative signals, capture decision, and persisted Intake row.
- Fresh Sheets readback after sync.
- Second sync proving deterministic duplicate handling.

**Required message matrix:**
1. Founder pitch with deck → `pitch`, captured.
2. Company update with traction or revenue → `company_info`, captured.
3. Warm founder/company introduction → `relationship`, captured.
4. Invoice or receipt → `operational`, skipped.
5. Password or verification notice → `operational`, skipped.
6. Newsletter → `noise`, skipped.
7. Generic SEO or lead-generation solicitation → `noise`, skipped.
8. Ambiguous short company message → deterministic documented result.

**Pass condition:** Expected classification and capture behavior for every case, with no contact auto-created.

### 2.2 Cross-instance duplicate handling under simultaneous deployed syncs

**Required evidence:**
- One live Gmail message with a unique evidence ID.
- Five to ten concurrent requests against the deployed `/api/gmail/sync` endpoint.
- Requests issued without client-side serialization.
- Fresh Google Sheets readback after all requests complete.
- Exactly one canonical Intake row.
- All remaining requests report duplicate or already-processed behavior.
- Repeat run after a delay to increase the chance of multiple Cloudflare isolates.

**Pass condition:** Exactly one persisted canonical row across every concurrency run.

**Architecture warning:** Google Sheets plus stateless Cloudflare workers cannot guarantee a true global atomic uniqueness constraint. Failure of this proof lane requires a durable lock/idempotency store; it must not be hidden by weakening the test.

### 2.3 Live Google Sheets maintenance behavior

**Required evidence:**
- Dedicated test spreadsheet or isolated test tabs.
- Fixture containing one missing tab, one missing header, one malformed boolean, one unsupported status, one missing safe timestamp, one duplicate candidate, and one valid unchanged row.
- Maintenance run with before/after snapshots.
- Maintenance log readback.
- Second maintenance run proving idempotency.
- Controlled permission-denied and missing-spreadsheet failures proving diagnostic error codes.

**Pass condition:** Required repairs occur, valid data remains unchanged, duplicates are reported rather than deleted, logs persist, and rerun produces no unintended changes.

### 2.4 Headed Playwright journeys

**Required evidence:**
- Local browser-visible execution using `npm run test:e2e:maxdepth-headed`.
- Updated journey coverage for intelligent inbox, duplicate telemetry, Settings explainers, maintenance states, active/history filters, contact archive/restore, event revoke/restore, fresh readback, mobile navigation, and failure states.
- Trace, screenshots, console errors, failed requests, final URL, and persistence readback on failures.

**Pass condition:** All critical journeys pass in headed mode with no skipped critical tests.

### 2.5 Deployed Cloudflare runtime

**Required evidence:**
- Successful Cloudflare deployment.
- Explicit deployed base URL.
- `validate:postdeploy:strict` against that URL.
- Deployed route, asset, auth-boundary, provider-health, no-localhost, and no-raw-crash checks.
- Deployment URL and version recorded.

**Pass condition:** Deployed smoke and required critical lanes pass against the real Cloudflare runtime.

### 2.6 GitHub Actions

**Required evidence:**
- `gh run list --limit 20` after the release push.
- Failed workflow logs inspected with `gh run view <RUN_ID> --log-failed`.
- Validation and deployment workflow status recorded.

**Pass condition:** Required workflows complete successfully; skipped or cancelled critical workflows do not count as proof.

### 2.7 Postdeploy provider proof

**Required evidence:**
- Explicit deployed base URL and real provider credentials.
- Guarded Tier 4 lanes for OAuth, Gmail, Sheets read/write, human review, contact workflow, touch workflow, auth boundary, and runtime context.
- Evidence report conforming to the repo report schema.
- No production-destructive test behavior.

**Pass condition:** Every required provider lane passes with durable readback and an evidence bundle.

## 3. Existing Test Proof Audit

### 3.1 TypeScript typecheck

**Command:** `npm run typecheck`  
**Proof class:** STATIC COMPILATION ASSURANCE  
**What it genuinely proves:** TypeScript can resolve the project and finds no type errors under the configured compiler options.  
**What it does not prove:** Runtime correctness, browser behavior, network calls, Cloudflare compatibility, Gmail/Sheets behavior, persistence, auth, or user outcomes.  
**Real-life proof verdict:** **No.** Valuable and legitimate, but static only.

### 3.2 Production build

**Command:** `npm run build`  
**Proof class:** LOCAL BUILD ASSURANCE  
**What it genuinely proves:** TypeScript build and Vite production bundling complete locally; imports and build-time transforms are resolvable.  
**What it does not prove:** Cloudflare deployment, deployed routes, runtime environment variables, provider credentials, middleware behavior, browser journeys, or persistence.  
**Real-life proof verdict:** **No.** It proves local buildability, not production behavior.

### 3.3 Structure validator

**Command:** `npm run validate:structure`  
**Proof class:** STATIC SOURCE-PRESENCE CONTRACT  
**What it genuinely proves:** Required files and selected source fragments exist; specified E2E test names are present; some forbidden fixture text is absent.  
**What it does not prove:** The referenced functions execute correctly, the E2E tests pass, route handlers work, data persists, or source fragments are semantically correct.  
**Risk:** Heavy exact-fragment dependence can pass broken implementations and fail harmless wording/refactor changes.  
**Real-life proof verdict:** **No.** Useful inventory guard, not behavior proof.

### 3.4 Domain workflow checks

**Command:** `npm run test:domain`  
**Proof class:** MOSTLY STATIC CONTRACT ASSERTIONS  
**What it genuinely proves:** Required domain symbols, source fragments, trigger aliases, persistence fields, cookie-related source patterns, and named E2E scenarios remain represented in source.  
**What it does not prove:** Domain functions produce correct values over a broad input matrix, APIs execute, Sheets writes occur, or E2E scenarios pass.  
**Risk:** The file reads source text and uses regex/string assertions more than executable behavior tests.  
**Real-life proof verdict:** **No.** The name overstates the current proof depth.

### 3.5 Provider/intelligent-inbox contract

**Command:** `npm run validate:provider-error-contract`  
**Proof class:** STATIC PROVIDER CONTRACT GUARD  
**What it genuinely proves:** Required error-code, redaction, review-only, classifier, telemetry, deterministic-ID, duplicate-recheck, and replay-detection source constructs are present.  
**What it does not prove:** Gmail classifies real messages correctly, token failures are actually redacted at runtime, deduplication survives concurrency, or Sheets persists the expected result.  
**Real-life proof verdict:** **No.** Correctly treated as a source contract gate only.

### 3.6 OAuth contract

**Command:** `npm run validate:oauth-connect-contract`  
**Proof class:** STATIC SECURITY/AUTH CONTRACT GUARD  
**What it genuinely proves:** Source contains signed state handling, Gmail scope, allowlist checks, encrypted token persistence calls, controlled Sheets error mapping, secure cookie attributes, and connection-status fields.  
**What it does not prove:** Google accepts the redirect, state/cookie behavior works in browsers, Cloudflare preserves cookies, tokens persist, allowlists enforce correctly in production, or refresh/revocation works.  
**Real-life proof verdict:** **No.** Security-significant static assurance, but not live OAuth proof.

### 3.7 Raw `atob` error guard

**Command:** `npm run validate:no-raw-atob-errors`  
**Proof class:** STATIC REGRESSION GUARD  
**What it genuinely proves:** Selected private-key files do not contain known unsafe decode patterns; the helper includes a catch path; an E2E test file contains the controlled error code assertion.  
**What it does not prove:** Every malformed key variant is handled, the E2E test ran, Cloudflare's runtime decoder behaves identically, or no other file introduces a decoding bug.  
**Real-life proof verdict:** **No.** Useful targeted regression prevention.

### 3.8 Documentation consolidation

**Command:** `npm run validate:docs-consolidation`  
**Proof class:** DOCUMENT INVENTORY ASSURANCE  
**What it genuinely proves:** Markdown files are mapped as active or archived and required documentation indexes exist.  
**What it does not prove:** Documentation is accurate, non-contradictory, current, understandable, executable, or aligned with runtime behavior.  
**Real-life proof verdict:** **No.** It proves documentation bookkeeping only.

### 3.9 Validator admission

**Command:** `npm run validate:validator-admission`  
**Proof class:** VALIDATOR GOVERNANCE ASSURANCE  
**What it genuinely proves:** Package scripts matching validation-related naming patterns are registered and include required matrix metadata.  
**What it does not prove:** Validators are useful, non-brittle, correctly classified, free of theater, or passing.  
**Real-life proof verdict:** **No.** Governance control only.

### 3.10 Validation matrix consistency

**Command:** `npm run validate:repo-matrix-consistency`  
**Proof class:** MATRIX/PACKAGE REFERENCE CONSISTENCY  
**What it genuinely proves:** Selected required scripts exist, selected target validators appear in the matrix, and selected wrappers are not recursively represented.  
**What it does not prove:** The whole matrix is correct, every severity maps to real risk, every validator is admitted appropriately, or any behavior works.  
**Real-life proof verdict:** **No.** Narrow consistency check.

### 3.11 Documentation/package-script consistency

**Command:** `npm run validate:docs-match-package-scripts`  
**Proof class:** COMMAND DOCUMENTATION REFERENCE CHECK  
**What it genuinely proves:** Six selected script names exist in `package.json` and appear somewhere in selected docs.  
**What it does not prove:** Commands are documented correctly, arguments are accurate, runbooks are complete, commands pass, or documentation matches current behavior.  
**Real-life proof verdict:** **No.** Narrow reference check.

### 3.12 ZIP integrity

**Proof class:** ARTIFACT CONTAINER ASSURANCE  
**What it genuinely proves:** The archive can be opened and its central directory is not corrupt.  
**What it does not prove:** Files are correct, complete, safe, buildable, deployable, or from the intended repo.  
**Real-life proof verdict:** **No.** Necessary packaging proof.

### 3.13 ZIP reopen and root verification

**Proof class:** ARTIFACT ROOT/SHAPE ASSURANCE  
**What it genuinely proves:** The ZIP reopens and expected root markers identify the intended repository without an accidental wrapper directory.  
**What it does not prove:** Runtime behavior, source correctness, or full file completeness beyond the checked markers.  
**Real-life proof verdict:** **No.** Strong packaging hygiene, not product proof.

### 3.14 Expected changed-file presence

**Proof class:** DELIVERY COMPLETENESS CHECK  
**What it genuinely proves:** Named files expected from the change set are present in the packaged artifact.  
**What it does not prove:** Their content is correct, integrated, executable, or sufficient.  
**Real-life proof verdict:** **No.** Delivery guard only.

### 3.15 Generated-folder exclusion

**Command/source guard:** `npm run validate:no-generated-artifacts` plus ZIP inspection  
**Proof class:** SOURCE HYGIENE ASSURANCE  
**What it genuinely proves:** Known generated/runtime folders are absent from the source snapshot at check time.  
**What it does not prove:** No other generated files exist, no secrets are present, or the application works.  
**Real-life proof verdict:** **No.** Repository hygiene only.

## 4. Proof Classification Law

Future reports must use these labels:

- **STATIC COMPILATION PASSED** — typecheck only.
- **LOCAL BUILD PASSED** — production bundle built locally.
- **STATIC CONTRACT VALIDATION PASSED** — source/schema/document contract checks.
- **UNIT BEHAVIOR TESTS PASSED** — executable isolated logic tests.
- **INTEGRATION TESTS PASSED** — connected service or persistence paths tested.
- **LOCAL HEADED BROWSER E2E PASSED** — real browser journeys against local runtime.
- **DEPLOYED SMOKE PASSED** — deployed routes and basic runtime checked.
- **POSTDEPLOY E2E PASSED** — browser journeys against deployed runtime.
- **LIVE PROVIDER PROOF PASSED** — real Gmail/Sheets/OAuth/provider behavior with durable readback.
- **CONCURRENCY/IDEMPOTENCY PROOF PASSED** — simultaneous deployed operations proven to result in one canonical write.
- **ARTIFACT STRUCTURALLY CHECKED** — ZIP/root/files/exclusions checked.

The word **validated** must always be accompanied by the specific layer.

## 5. Validator Improvement Rules

1. Static validators must not claim runtime proof.
2. Validators that only search for exact strings must be classified as static contract guards.
3. Exact wording checks are prohibited unless wording is a safety or product contract.
4. Behavior should move into executable tests where practical.
5. A validator must state what it proves and what it does not prove in the matrix.
6. New validators require admission; strengthening an existing validator is preferred when it covers the same risk.
7. No validator may pass solely because a test name exists.
8. No test may be described as real-life proof unless it executes the real runtime/provider and verifies readback.

## 6. Implementation Plan

### Phase A — Add missing live tests

Create or extend:
- `tests/e2e/live-gmail-intelligent-classification.spec.ts`
- `tests/e2e/deployed-gmail-concurrency.spec.ts`
- `tests/e2e/live-sheet-maintenance.spec.ts`

Add package scripts and matrix rows with explicit proof boundaries.

### Phase B — Expand headed UX proof

Update headed suites for every newly introduced UX/data-integrity behavior. Preserve diagnostics and avoid mocked-provider claims in reports.

### Phase C — Add deployment proof job

Extend the Cloudflare workflow or add a guarded postdeploy workflow that records the deployed URL and runs strict smoke. Live provider lanes remain manually guarded where credentials and production writes are involved.

### Phase D — GitHub and postdeploy evidence

Run required workflows, collect `gh` evidence, execute Tier 4 provider lanes, and produce one evidence report tied to the deployed revision.

### Phase E — Reclassify static checks

Update release summaries and matrix language so current static validators are never presented as real-life proof. Domain workflow checks should be renamed or gradually replaced with executable unit tests.

## 7. Completion Gates

The seven missing lanes remain **NOT PROVEN** until their pass conditions are met.

The existing fifteen checks remain valid within their declared layers. They may support a release, but they cannot substitute for live Gmail, Sheets, Cloudflare, concurrency, browser, GitHub, or postdeploy evidence.

**Highest status before the seven lanes pass:** `STRUCTURALLY CHECKED — LOCAL VALIDATION REQUIRED` or a narrower layer-specific status.

**COMPLETE requires:** required static checks, local headed browser E2E, deployed smoke, applicable GitHub Actions, live provider proof, persistence/readback, concurrency proof where claimed, artifact reopen, and no known critical failures.
