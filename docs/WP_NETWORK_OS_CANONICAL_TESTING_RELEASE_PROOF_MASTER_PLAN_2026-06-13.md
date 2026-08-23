# West Peek Network OS — Canonical Testing, Deep Validation, Release, Runtime Proof, Diagnostics, and Test-Data Lifecycle Master Plan

**Date:** 2026-06-13  
**Status:** PLANNING LOCKED — NO REPO WORK PERFORMED  
**Repo:** `west-peek-network-os`  
**Primary objective:** Prove as much as possible inside the assistant sandbox/container before requiring the operator to use Terminal, while preserving a deterministic repo-specific updater, predeploy/postdeploy proof model, diagnostics, and automatic cleanup of real-provider test fixtures.

---

# 1. Executive decision

West Peek Network OS will use one canonical validation and release architecture:

1. **Tier 1 — Static and Structural Assurance**
2. **Tier 2 — Local Behavioral and Integration Assurance**
3. **Tier 3 — Local Browser and Full-Journey Assurance**
4. **Tier 4 — Live Provider and Deployed Runtime Proof**
5. **Container-First Deep Validation — assistant-run proof before handoff**
6. **Master Gauntlet — capstone critical-journey orchestration**
7. **Predeploy Gate — release-readiness before push/deploy**
8. **Postdeploy Gate — deployed runtime and provider proof**
9. **Diagnostics Standard — required evidence for runtime tests**
10. **Proof-Fixture Lifecycle — automatic test-data cleanup**
11. **Dedicated West Peek Updater Sequence — one canonical operator path**

The governing operating principle is:

> The assistant must perform every safe, non-production, non-secret-dependent validation available in its sandbox or internal container before asking the operator to use Terminal.

Terminal is reserved for proof that materially depends on:

- the operator's local repo identity and updater
- local secrets not available to the assistant
- GitHub authentication and workflow state
- Cloudflare deployment state
- real Gmail access
- real Google Sheets access
- production browser/runtime behavior
- guarded live-provider writes

The user should not manually execute twenty separate commands. Composite commands and repo-specific wrappers must orchestrate the full sequence.

---

# 2. System classification and proof burden

West Peek Network OS is a **Level 5 complex operational application** because it includes:

- authenticated operator access
- Gmail ingestion and shared-mailbox monitoring
- Google Sheets persistence
- contact, approval, touchpoint, notification, and event lifecycles
- mutating operator workflows
- external provider dependencies
- Cloudflare deployment
- live data-integrity risks
- real-provider fixture cleanup requirements

The required proof burden therefore includes:

- static and structural checks
- unit and integration tests
- deterministic classifier tests
- persistence and readback tests
- duplicate/race-condition tests
- local headed browser journeys
- live Gmail and Sheets proof
- Cloudflare deployed smoke
- GitHub Actions verification
- postdeploy critical-lane E2E
- diagnostics and evidence bundles
- test-fixture cleanup verification

---

# 3. Proof-layer laws

## 3.1 Exact proof naming

Every test, validator, workflow, and report must declare one primary proof layer:

- STATIC CONTRACT
- STRUCTURAL ASSURANCE
- LOCAL BUILD
- UNIT LOGIC
- LOCAL INTEGRATION
- LOCAL BROWSER E2E
- LOCAL PERSISTENCE/READBACK
- LIVE PROVIDER
- DEPLOYED SMOKE
- POSTDEPLOY E2E
- PACKAGING/ARTIFACT
- DOCUMENTATION/GOVERNANCE

## 3.2 No-overclaiming law

Every test must declare:

- what it proves
- what it does not prove
- required environment
- whether it writes data
- whether cleanup is required
- diagnostics produced
- severity when failing
- whether failure blocks deployment

## 3.3 Outcome-first law

A test passes only when the expected outcome is proven.

- A toast is not persistence proof.
- A `200` response is not workflow proof.
- A route render is not journey proof.
- A deployment upload is not deployed runtime proof.
- A success response without durable readback is incomplete proof.

## 3.4 Runtime separation law

These contexts are separate:

- source inspection
- assistant sandbox/container
- local unit process
- local integration process
- local manual server
- Playwright self-spawn server
- local headed browser
- GitHub Actions
- Cloudflare preview
- Cloudflare production
- live Gmail
- live Google Sheets

Passing in one context never proves another.

---

# 4. Tier architecture

## Tier 1 — Static and Structural Assurance

### Purpose

Catch source, schema, documentation, security-pattern, artifact, and build-contract defects before runtime.

### Includes

- TypeScript typecheck
- production build
- structure validator
- domain workflow source-contract checks
- provider/intelligent-inbox source contract
- OAuth source contract
- raw `atob` guard
- documentation consolidation
- validator admission
- validation matrix consistency
- documentation/package-script consistency
- secret-pattern scanning
- environment contract validation
- ZIP integrity
- ZIP root verification
- expected changed-file presence
- generated-folder exclusion

### Rules

- Tier 1 never claims runtime proof.
- Exact wording checks are forbidden unless safety-critical.
- Overlapping validators must be merged.
- Each hard fail must map to a real production risk.
- Failures should aggregate where safe.

---

## Tier 2 — Local Behavioral and Integration Assurance

### Purpose

Prove logic, API behavior, normalization, persistence adapters, error mapping, and provider contracts without requiring a deployed environment.

### Required coverage

- intelligent inbox classifier unit matrix
- Gmail body normalization
- deterministic ingestion keys
- duplicate detection and replay behavior
- maintenance error mapping
- local API-handler tests
- local Sheets adapter tests using isolated fixtures/test doubles
- local Gmail payload-fixture tests
- mutation-state and duplicate-click logic
- auth/session handler tests
- fresh-readback/cache-bypass tests
- archive/restore lifecycle
- event revoke/restore lifecycle
- notification creation/resolution
- proof-fixture ledger behavior
- proof cleanup selection and refusal rules

### Intelligent inbox classifier matrix

Must cover:

- pitch
- company information
- founder/company update
- relationship introduction
- operational message
- newsletter/noise
- generic sales solicitation
- ambiguous near-threshold message
- attachment-only pitch
- reply-chain pitch
- malformed sender envelope

Each case must assert:

- category
- score
- positive signals
- negative signals
- capture decision
- default intake type
- review-only behavior

### Deterministic deduplication matrix

Must cover:

- same mailbox + same Gmail message ID
- different mailbox + same Gmail message ID
- RFC Message-ID fallback
- malformed/missing Message-ID
- repeated sync after persistence
- simultaneous local requests
- duplicate pre-append recheck

---

## Tier 3 — Local Browser and Full-Journey Assurance

### Tier 3A — Mocked browser journeys

Purpose: deterministic UI proof without provider instability.

Must cover:

- loading, success, empty, filtered-empty, and error states
- pending button labels and sibling-action disabling
- duplicate-click prevention
- active/history views
- contact archive/restore
- event revoke/restore
- Settings explainers
- maintenance preflight states
- maintenance diagnostic errors
- mobile navigation
- keyboard operation
- raw Gmail source disclosure
- result counts and filter persistence

### Tier 3B — Local full-stack journeys

Purpose: prove UI + real local API + persistence adapter behavior.

Must cover:

- intake lifecycle with durable readback
- approval lifecycle
- contact lifecycle
- event lifecycle
- notification lifecycle
- fresh Sheets snapshot behavior through the local adapter
- local maintenance fixture lifecycle
- proof-fixture creation and cleanup
- refresh and re-entry

### Headed rule

All local browser proof runs must default to headed mode when run on the operator machine. The assistant container may run headless when no display exists, but must still generate traces, screenshots, and reports.

---

## Tier 4 — Live Provider and Deployed Runtime Proof

### Required lanes

1. Live Gmail classification accuracy
2. Live Gmail ingestion
3. Live Google Sheets read/write
4. Live Google Sheets maintenance
5. Cross-instance simultaneous-sync duplicate race
6. Deployed Cloudflare route smoke
7. Deployed auth-boundary smoke
8. Deployed provider-health proof
9. Postdeploy critical browser journeys
10. GitHub Actions verification
11. Proof-fixture cleanup and cleanup verification

### Locked missing tests

#### Live Gmail classification matrix

Seed unique real messages representing:

- founder pitch with deck
- company update with traction/revenue
- warm introduction
- invoice/receipt
- password reset
- newsletter
- generic SEO solicitation
- ambiguous company message

Prove:

- classification category and score
- matched signals
- capture/skip decision
- no automatic contact creation
- persistence after fresh readback
- deterministic second-sync result

#### Cross-instance duplicate race

- seed one unique Gmail message
- issue 5–10 simultaneous deployed sync requests
- use multiple clients/connection pools where feasible
- fresh-read Sheets
- assert exactly one canonical intake row
- assert all other attempts report duplicate skip or conflict
- capture Cloudflare request IDs
- rerun after delay to increase isolate diversity

#### Live Sheets maintenance fixture

Use isolated test-owned tabs or rows containing:

- missing tab
- missing header
- malformed boolean
- unsupported status
- missing timestamp
- duplicate candidate
- valid control row

Prove:

- repairs are correct
- valid rows remain unchanged
- duplicate is reported, not silently deleted
- maintenance log is written
- second run is idempotent
- permission and configuration failures map to correct diagnostic codes

---

# 5. Container-First Deep Validation Mode

## 5.1 Purpose

The assistant must do as much validation as safely possible before handing work to the operator.

Deep Validation runs in a fresh assistant-controlled unpacked workspace and produces a proof report plus diagnostics. It is not allowed to claim live Gmail, live Sheets, GitHub, Cloudflare, or production proof unless those environments are actually available.

## 5.2 Trigger and command

Canonical mode name:

`DEEP VALIDATION MODE — WEST PEEK NETWORK OS`

Planned composite repo command:

`npm run deep-validation`

Assistant-side orchestration may call the equivalent scripts directly when the composite command does not yet exist.

## 5.3 Default internal sequence

1. Confirm ZIP identity and naming.
2. Reopen into a fresh temporary directory.
3. Detect repo root.
4. Inspect repo authority files.
5. Confirm Node/package-manager contract.
6. Scan for real secrets.
7. Install dependencies from lockfile.
8. Run Tier 1.
9. Run Tier 2.
10. Run browser-independent integration tests.
11. Run Tier 3A in headless mode with traces/screenshots.
12. Run Tier 3B where local adapters and environment permit.
13. Run production build.
14. Run Cloudflare/OpenNext build when configuration permits and no production secrets are required.
15. Run generated-artifact hygiene checks.
16. Run documentation/matrix consistency.
17. Run hostile review of failures and false-positive validators.
18. Produce diagnostics and proof summary.
19. Clean generated artifacts.
20. Package/reopen the validated baseline ZIP when source changes exist.

## 5.4 Internal proof target

Before handoff, the assistant should normally prove:

- Tier 1 complete
- Tier 2 complete
- Tier 3A complete
- Tier 3B complete where provider-independent
- local production build
- local Cloudflare/OpenNext build where feasible
- diagnostics generation
- proof-fixture cleanup logic using local/test adapters
- packaging integrity

## 5.5 Internal environment gaps

The assistant must explicitly label anything blocked by:

- no Gmail credentials
- no Google service-account credentials
- no GitHub authentication
- no Cloudflare authentication
- no deployed URL
- no headed display
- provider IP/consent restrictions
- destructive production-write risk

These are `ENVIRONMENT GAP`, not product failures.

## 5.6 Handoff minimization law

The operator should receive the smallest possible remaining checklist.

The handoff report must state:

- already proven internally
- not provable internally
- exact reason
- one composite command to run next
- expected output
- what evidence to return only if failure occurs

No handoff may ask the operator to rerun checks already proven in the same artifact unless local updater policy requires it as an enforcement gate.

---

# 6. Master Gauntlet architecture

The Master Gauntlet is the capstone orchestration layer. It does not duplicate every test; it invokes the critical lanes and verifies the evidence chain.

## Required lanes

1. Operator queue lifecycle
2. Shared-inbox intelligent monitoring
3. Gmail duplicate resistance
4. Sheet-maintenance lifecycle
5. Contact archive/restore
6. Event revoke/restore
7. Approval lifecycle
8. Notifications lifecycle
9. Proof-fixture creation and cleanup
10. Deployed operator-trust journey

## Local Master Gauntlet

Runs internally where possible and on the operator machine before push:

- Tier 2 critical logic
- Tier 3A critical browser journeys
- Tier 3B provider-independent full-stack journeys
- persistence/readback
- refresh/re-entry
- diagnostics verification
- cleanup verification

## Deployed Master Gauntlet

Runs after deployment:

- live shared-inbox founder journey
- live Gmail classification matrix
- cross-instance duplicate race
- live Sheets maintenance fixture
- deployed auth boundaries
- deployed mobile critical journey
- cleanup verification

## Gauntlet pass requirements

- no skipped critical lanes
- durable state readback
- refresh/re-entry proof
- explicit base URL/runtime context
- evidence IDs for provider tests
- diagnostics for every failure
- cleanup report with zero unexplained fixtures

---

# 7. Predeploy architecture

## Assistant-side pre-handoff deep validation

The assistant runs `deep-validation` first and supplies the proof report with the ZIP.

## Local updater prepush gate

The dedicated updater runs one composite command:

`npm run release:prepush`

It should not manually execute twenty scripts.

### `release:prepush` sequence

1. environment contract validation
2. Tier 1
3. Tier 2
4. critical local Master Gauntlet
5. production build
6. Cloudflare/OpenNext build when required
7. artifact hygiene
8. documentation and matrix consistency
9. secret exposure check
10. prepush proof report

Results:

- `PREPUSH PASSED`
- `PREPUSH PASSED WITH WARNINGS`
- `PREPUSH BLOCKED`

The updater stops before commit and push on blockers.

---

# 8. Postdeploy architecture

Canonical command:

`npm run release:postpush`

### Sequence

1. Verify GitHub Actions runs.
2. Collect failed workflow logs.
3. Resolve deployed URL and version.
4. Run route smoke.
5. Run auth-boundary smoke.
6. Run provider-health smoke.
7. Run deployed browser critical journeys.
8. Run guarded live-provider lanes where required.
9. Verify proof-fixture cleanup.
10. Assemble postdeploy evidence bundle.

Results:

- `POSTDEPLOY PROOF PASSED`
- `POSTDEPLOY PROOF PASSED WITH WARNINGS`
- `POSTDEPLOY PROOF FAILED`
- `POSTDEPLOY PROOF INCOMPLETE`

Live provider tests must never be silently triggered by ordinary CI if they create production data. They require explicit guarded invocation.

---

# 9. Dedicated West Peek updater sequence

## 9.1 Wrapper

Create:

`~/update_west_peek_network_os_from_zip.sh`

It wraps:

`~/update_repo_from_zip_generic_v3.sh ZIP_PATH REPO_PATH snapshot west-peek-network-os`

## 9.2 Wrapper responsibilities

1. validate ZIP filename
2. verify ZIP integrity and root
3. confirm local repo identity and branch
4. reject unsafe dirty state
5. create rollback checkpoint
6. perform snapshot dry-run
7. show deletions/replacements
8. apply snapshot
9. restore executable bits
10. run `npm run release:prepush`
11. stop on failure
12. commit and push only after pass
13. print the exact `release:postpush` command
14. preserve logs and proof reports

The wrapper must not deploy directly.

---

# 10. Composite command architecture

## Canonical operator commands

### `npm run verify:fast`

Rapid feedback:

- typecheck
- targeted Tier 1
- relevant unit tests
- no build/browser/live providers

### `npm run deep-validation`

Maximum safe local/container proof:

- full Tier 1
- full Tier 2
- Tier 3A
- provider-independent Tier 3B
- build
- Cloudflare/OpenNext build where feasible
- diagnostics
- artifact hygiene
- proof report

### `npm run verify:local`

Operator-facing local full proof:

- Tier 1
- Tier 2
- Tier 3A headed
- Tier 3B headed/provider-independent
- local Master Gauntlet
- build

### `npm run release:prepush`

Canonical updater gate.

### `npm run release:postpush`

Canonical post-push/deployment verification.

### `npm run release:live-proof`

Guarded live Gmail/Sheets/deployed proof with automatic fixture cleanup.

### `npm run release:full`

Orchestration helper that pauses at push/deploy boundaries and never pretends asynchronous results are known.

Lower-level commands remain under:

- `tier1:*`
- `tier2:*`
- `tier3:*`
- `tier4:*`
- `gauntlet:*`
- `diagnostics:*`
- `fixtures:*`
- `release:*`

They belong in debugging runbooks, not normal operator instructions.

---

# 11. Diagnostics architecture

## 11.1 Required scope

All Tier 3 and Tier 4 tests require diagnostics on failure. Tier 4 must preserve evidence on success and failure.

## 11.2 Bundle path

`artifacts/diagnostics/<run_id>/<test_id>/`

## 11.3 Required files

- `summary.json`
- `runtime-context.json`
- `request-metadata.json`
- `response-metadata.json`
- `console.log`
- `network.json`
- `persistence-readback.json`
- `provider-evidence.json`
- screenshot(s)
- Playwright trace when browser-based
- cleanup report when fixtures were created

## 11.4 Standard summary fields

- run ID
- test ID
- proof layer
- environment
- base URL
- provider
- persona
- expected outcome
- actual outcome
- final URL
- state/readback result
- cleanup result
- failure category
- retryability
- secret-redaction status
- completion impact

## 11.5 Failure categories

- AUTH_FAILURE
- PERMISSION_FAILURE
- PROVIDER_FAILURE
- RATE_LIMIT
- TIMEOUT
- DUPLICATE_WRITE
- STALE_READBACK
- CLASSIFICATION_FAILURE
- MAINTENANCE_FAILURE
- DEPLOYMENT_FAILURE
- ENVIRONMENT_GAP
- UI_REGRESSION
- CLEANUP_FAILURE
- TEST_HARNESS_FAILURE

## 11.6 Provider evidence

Gmail:

- mailbox ID/address
- Gmail message ID
- thread ID
- RFC Message-ID hash
- classification category and score
- ingestion result

Sheets:

- spreadsheet identifier hash
- tab name
- row IDs/indices where safe
- maintenance run ID
- before/after summaries

Cloudflare:

- deployed URL
- deployment/version ID
- request ID where available
- route and status

GitHub:

- workflow name
- run ID
- conclusion
- commit SHA

No raw secrets or unnecessary personal data may be included.

---

# 12. Proof-fixture lifecycle and cleanup

## 12.1 Required fixture metadata

Every live proof record must carry:

- `proof_run_id`
- `proof_test_id`
- `proof_fixture: true`
- `proof_created_at`
- `proof_cleanup_policy`
- `proof_expires_at`

The marker must propagate across Intake, Contacts, Approvals, Touchpoints, Notifications, Events, Attendees, Gmail evidence, and Sheets maintenance fixtures.

## 12.2 Fixture ledger

Each run creates a ledger recording:

- provider
- entity type
- stable entity ID
- creation result
- expected cleanup action
- cleanup status
- cleanup evidence

No cleanup may rely on fuzzy names such as “Test User.”

## 12.3 Cleanup policy

Operational records are cleaned append-only:

- `status: proof_archived`
- `proof_cleaned_at`
- `proof_cleanup_run_id`

Temporary maintenance tabs use exact names:

`__proof_<run_id>_<tab_name>`

Only exact registered test-owned tabs may be physically deleted.

Gmail proof messages are archived or relabeled by default, not permanently deleted.

## 12.4 Cleanup commands

- `npm run fixtures:list`
- `npm run fixtures:cleanup -- --run-id=<id>`
- `npm run fixtures:cleanup:expired`
- `npm run fixtures:verify-clean`
- `npm run fixtures:report`

## 12.5 Finally rule

Every live test must:

1. create fixtures
2. register them
3. run proof
4. capture diagnostics
5. clean in `finally`
6. verify cleanup
7. write final report

A proof run with incomplete cleanup cannot pass.

Required result:

`PROOF FAILED — CLEANUP INCOMPLETE`

---

# 13. GitHub Actions architecture

Target workflows:

- `validate.yml` — Tier 1, Tier 2, selected Tier 3A
- `predeploy.yml` — canonical predeploy gate
- Cloudflare Pages native Git integration — deploy the validated `main` commit without a duplicate GitHub Actions deploy lane
- `postdeploy-smoke.yml` — deployed smoke and guarded critical paths
- `live-provider-proof.yml` — manual protected Gmail/Sheets proof
- `release-proof.yml` — aggregate proof reports and run IDs

CI must not run destructive provider tests automatically.

---

# 14. Validator simplification architecture

## Keep

- validators protecting security, data integrity, deployability, provider contracts, and artifact safety

## Merge

- overlapping Gmail/provider validators
- overlapping documentation validators
- ZIP/root/changed-file/generated-folder checks into one artifact validator

## Demote or remove

- exact wording checks
- date-specific checks
- token checks duplicated by TypeScript/integration tests
- validators that merely restate package scripts
- validators with no production-risk mapping

Every validator must declare:

- tier
- severity
- proof boundary
- diagnostics
- failure handling
- matrix owner

---

# 15. Documentation architecture

Canonical documents after migration:

1. `TESTING_ARCHITECTURE.md`
2. `REPO_VALIDATION_MATRIX.md`
3. `MASTER_GAUNTLET.md`
4. `PREDEPLOY_POSTDEPLOY_RUNBOOK.md`
5. `REAL_RUNTIME_PROOF_MATRIX.md`
6. `DIAGNOSTICS_STANDARD.md`
7. `TEST_FIXTURE_LIFECYCLE.md`
8. `WEST_PEEK_UPDATER_RUNBOOK.md`
9. `KNOWN_EDGE_CASE_INVENTORY.md`
10. `RUNTIME_CONTEXT_TRACE_MATRIX.md`
11. `ARCHITECTURAL_DECISIONS.md`
12. `ARTIFACT_MANIFEST.md`

Overlapping legacy E2E, tier, provider, proof, and release documents should be consolidated and archived, not silently deleted.

---

# 16. Implementation plan

## Phase 1 — Inventory and mapping

- inventory all scripts, validators, tests, workflows, and docs
- map each to Tier 1–4
- classify keep/merge/rewrite/demote/remove
- identify duplicate execution
- identify missing diagnostics and cleanup

## Phase 2 — Composite orchestration

- add `verify:fast`
- add `deep-validation`
- add `verify:local`
- add `release:prepush`
- add `release:postpush`
- add `release:live-proof`
- add machine-readable proof summaries

## Phase 3 — Tier 1 simplification

- merge artifact validators
- merge documentation validators
- remove stale/date-specific/token-only checks
- update validation matrix

## Phase 4 — Tier 2 foundations

- classifier matrix
- Gmail normalization
- deterministic idempotency
- maintenance integration
- lifecycle tests
- cleanup ledger and refusal tests

## Phase 5 — Tier 3 architecture

- split mocked and full-stack suites
- enforce headed local default
- add diagnostics helper
- add proof-fixture local lifecycle
- build local Master Gauntlet

## Phase 6 — Tier 4 architecture

- live Gmail classification matrix
- live Sheets maintenance fixture
- deployed duplicate-race test
- deployed browser critical lanes
- provider health/readback
- cleanup verification

## Phase 7 — Release and updater

- create dedicated updater wrapper
- connect `release:prepush`
- add postpush instructions
- add rollback and log preservation

## Phase 8 — Workflow migration

- update GitHub Actions
- protect live-provider workflow
- aggregate proof reports
- preserve diagnostics as artifacts

## Phase 9 — Documentation consolidation

- create canonical docs
- archive superseded docs
- update active docs index
- update architectural decisions

## Phase 10 — Hostile migration review

- prove no old command is still required unexpectedly
- prove no validator silently disappeared
- prove composite commands do not double-run expensive suites
- prove cleanup cannot target legitimate records
- prove diagnostics redact secrets
- prove updater stops before push on blockers

---

# 17. Canonical operator sequence

## Assistant delivery

The assistant delivers:

- full baseline ZIP
- Deep Validation report
- diagnostics bundle
- exact unproven layers
- one remaining operator command

## Operator updater

`~/update_west_peek_network_os_from_zip.sh <baseline-zip>`

The wrapper applies the ZIP, runs `release:prepush`, commits, and pushes only after success.

## After push

`npm run release:postpush`

## When live provider proof is required

`npm run release:live-proof`

## After interrupted proof

`npm run fixtures:cleanup -- --run-id=<proof_run_id>`

---

# 18. Acceptance criteria

The new architecture is accepted only when:

1. Every test and validator is assigned to exactly one primary tier.
2. Composite commands replace long manual command sequences.
3. Deep Validation runs as much as safely possible inside assistant containers.
4. The operator receives a minimal terminal checklist.
5. The Master Gauntlet covers all critical product journeys.
6. Real-runtime tests generate diagnostics on success and failure as required.
7. Live tests register and automatically clean proof fixtures.
8. Cleanup failure blocks proof completion.
9. Predeploy and postdeploy are separate evidence stages.
10. GitHub Actions report real workflow state without claiming deployed behavior they do not test.
11. Validators comply with the matrix and do not overclaim.
12. Documentation converges on the canonical set.
13. The dedicated updater prevents wrong-repo and wrong-mode execution.
14. No normal release requires twenty individual npm commands.
15. No production proof record remains in normal operator views after successful cleanup.

---

# 19. Final proof model

- **Tier 1:** The repo is shaped correctly.
- **Tier 2:** The logic behaves correctly locally.
- **Tier 3:** An operator can complete the workflow locally.
- **Tier 4:** The deployed product works with real providers.
- **Deep Validation:** The assistant proves every safe internal layer before handoff.
- **Master Gauntlet:** Critical outcomes work end to end.
- **Predeploy:** The change is safe to push/deploy.
- **Postdeploy:** The deployed runtime is actually working.
- **Diagnostics:** Failures are explainable without guessing.
- **Fixture lifecycle:** Real proof does not pollute the product.
