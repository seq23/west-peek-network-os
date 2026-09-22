# Repo Validation Matrix

Hard proof commands:


- `npm run validate:predeploy:full` — source/static/build/contract/docs hygiene and Tier 4-ready dry-run proof.
- `npm run validate:postdeploy:strict` — Tier 3 deployed smoke/safety check with explicit deployed URL.
- `npm run tier4:ultimate-live-proof` — Tier 4 postdeploy live provider + data proof.
- `npm run release:proof` — wrapper that runs predeploy, then postdeploy if a deployed URL is provided, then Tier 4 only when `TIER4_ULTIMATE_LIVE_PROOF=1` is set.


## Static/predeploy hard fail validators

- `validate:no-generated-artifacts`
- `validate:google-private-key-contract`
- `validate:no-raw-atob-errors`
- `validate:oauth-connect-contract`
- `validate:provider-error-contract`
- `validate:tier4-live-proof-contract`
- `validate:tier4-lane-registry`
- `validate:tier4-report-schema`
- `validate:repo-matrix-consistency`
- `validate:no-localhost-defaults`


## Documentation advisory validators — never release-blocking

The following validators are documentation/governance advisories only. They may emit `STRONG WARNING` or `WARNING`, but they must never stop build, browser proof, updater commit, push, or release:

- `validate:artifact-manifest-current`
- `validate:docs-match-package-scripts`
- `validate:tier-docs-current`
- `validate:tier4-docs-complete`
- `validate:docs-consolidation`

Locked rule: documentation-only drift is not equivalent to product, security, data-integrity, deployment, or artifact-safety failure.

## Tier 4 lanes

- `tier4-prereq-postdeploy-strict`
- `tier4-oauth-connect-live`
- `tier4-gmail-trigger-ingestion-live`
- `tier4-google-sheets-readwrite-live`
- `tier4-human-review-workflow-live`
- `tier4-contact-workflow-live`
- `tier4-relationship-touch-live`
- `tier4-public-event-live`
- `tier4-pitchlab-signed-handoff-live`
- `tier4-ai-ocr-voice-live`
- `tier4-auth-boundary-live`
- `tier4-runtime-context-live`
- `tier4-report-check`

## Validator Simplification Update — 2026-06-12

Primary release gates are now:

- `npm run validate:predeploy:full`
- `npm run validate:postdeploy:strict`
- `npm run tier4:ultimate-live-proof`
- optional wrapper: `npm run release:proof`

The legacy `validate:hostile-master-addendum` exact-token audit is archived as informational only. It no longer blocks release because the repo now uses targeted docs/package/matrix/Tier 4 contract validators that fail on actual omissions instead of wording drift.

Tier 4 live-provider requirements remain hard requirements during Tier 4. They are not predeploy blockers when deployed URL, OAuth state, Gmail evidence, or live provider credentials are intentionally absent.

### Wrapper exclusion rule

Convenience wrappers (`release:proof`, `test:everything`, `validate:predeploy:full`, `validate:postdeploy:strict`) are package entrypoints, not matrix rows. They are excluded from `_repo_validation_matrix.json` to prevent recursive/self-nesting validation loops. Target validators and proof lanes remain represented in the matrix.

## UX/data-integrity hostile-review update — 2026-06-13

No new standalone validator was admitted. The existing `validate:provider-error-contract` gate now covers the intelligent shared-inbox and deduplication source contract. This avoids a second token-scanning validator for the same production risk.

Proof boundary: the static gate proves required controls exist in source. Only live Gmail/Sheets evidence can prove production classification quality and duplicate behavior across Cloudflare instances.

## Locked Proof Completion Lanes — 2026-06-13

The authoritative implementation and evidence requirements are in `PROOF_COMPLETION_MASTER_PLAN_2026-06-13.md`.

The following remain NOT PROVEN until their dedicated live/deployed lanes pass:

1. Live Gmail intelligent classification accuracy.
2. Cross-instance duplicate handling under simultaneous deployed syncs.
3. Live Google Sheets maintenance behavior and idempotency.
4. Headed Playwright journeys for the current UX/data-integrity changes.
5. Deployed Cloudflare runtime.
6. GitHub Actions status for the delivered revision.
7. Postdeploy provider proof.

Typecheck, local build, static validators, documentation governance, and ZIP checks must be reported only under their specific proof layers. They do not substitute for the seven lanes above.

## Canonical migration additions — 2026-06-13

| Validator / Test | Command | Category | Severity | Production Risk | What It Proves | What It Does Not Prove | Failure Handling |
|---|---|---|---|---|---|---|---|
| Provider architecture integration | `npm run test:provider-architecture` | LOCAL INTEGRATION | HARD FAIL | Fixture/live contract drift, unsafe test auth, non-durable local proof | Twelve intelligent-inbox fixtures, explicit provider modes, production exclusion, durable local Sheets readback, dedupe, maintenance idempotency, exact cleanup | Live Gmail, live Sheets, deployed concurrency | Fix product or harness; do not weaken fixtures |
| Local Master Gauntlet | `npm run test:gauntlet:local` | LOCAL PERSISTENCE/READBACK | HARD FAIL | Broken critical lifecycle or fake local persistence | Founder inquiry capture, ten-way local duplicate resistance, maintenance idempotency, contact lifecycle, event history preservation, approval/notification resolution, fresh readback, cleanup | Cloudflare isolate race, real provider behavior, headed UX | Preserve diagnostics and fix exact failed lane |
| Test-auth production exclusion | Included in `test:provider-architecture` | SECURITY CONTRACT | HARD FAIL | Production auth bypass | Test auth requires explicit test env/provider/local host | Production OAuth correctness | Block release |
| Hallmark expert review | `~/run_hallmark_audit.sh <repo> ...` plus expert review | HUMAN UX REVIEW | STRONG WARNING / HARD FAIL when trust or usability is materially damaged | Human-hostile or brand-damaging UX | Evidence pack plus expert findings and remediation | Runtime correctness | Implement approved findings and run browser proof |

| Browserless mocked web contracts | `npm run test:web-contracts:mocked` | LOCAL INTEGRATION | HARD FAIL | Client/API contract drift | Request routing, serialization, snapshot normalization, fresh-read metadata, structured error propagation | DOM, navigation, layout, real browser, deployment, live providers | Fix client contract or objectively wrong fixture | No |


## Authenticated Product Usability Addendum — 2026-06-13

This repository adopts `docs/REPO_MASTER_CONTRACT_ADDENDUM_AUTHENTICATED_PRODUCT_USABILITY_2026-06-13.md`. Route-complete authenticated usability, production-shaped rendering, control-to-persistence proof, refresh/re-entry, maintenance scale, post-cleanup audit, and route-complete Hallmark are distinct mandatory proof layers.


## Gmail sync UI hostile coverage — 2026-06-14

| Layer | Command | Proof |
|---|---|---|
| Static/UI contract | `npm run test:critical-ui-data-flow` | Shared Gmail control appears on Dashboard, Intake Queue, and Settings; exact approved mailbox set; endpoint allowlist; narrow integrity behavior |
| Authenticated usability | `npm run validate:authenticated-usability-contract` | Operator wording distinguishes Gmail import from Sheets refresh and identifies separate OAuth requirements |
| Browser behavior | `npm run test:e2e:maxdepth` or `npm run test:e2e:container` | Sequential three-mailbox batch, connected/not-connected reporting, partial/malformed failure isolation, automatic refresh, and repeated-click lock |

Browser collection without execution is not behavior proof. A runtime without an admitted Chromium executable must report the browser lane as UNPROVEN and defer it to the local updater's real-browser prepush.

### Site form intake door — 2026-09-22

`test:site-form-intake` (`tests/domain/site-form-intake.mjs`) is a tier 1 HARD FAIL
lane, admitted in `_validator_admission_register.json` and selected in
`_repo_validation_matrix.json`, so `npm run validate:everything -- --tier=1` runs
it. It imports `functions/_shared/siteFormContact.ts` and executes it: the
decision module holds no I/O precisely so the test runs the shipping code rather
than a transcription. 98 checks. It does not prove a deployed door or a live
Google Sheets write; the proof-fixture flow through production does that.

