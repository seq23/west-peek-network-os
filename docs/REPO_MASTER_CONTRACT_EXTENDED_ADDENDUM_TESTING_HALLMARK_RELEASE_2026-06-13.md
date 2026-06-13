# Repo and Project Instructions Master Operating Contract
## Extended Master Addendum — Universal Testing Architecture, Hallmark Authority, Deep Validation, Diagnostics, Vault Policy, and v3.1 Release Flow

**Date:** 2026-06-13  
**Status:** LOCKED ADDENDUM — GENERIC / CROSS-REPO  
**Applies to:** `Repo_and_Project_Instructions_Master_Operating_Contract.md`  
**Scope:** All new and legacy repositories unless a repo-specific authority document explicitly defines stricter requirements.  
**Supersession rule:** This addendum is additive. Where an older generic process conflicts with this addendum, this addendum governs. Repo-specific product behavior remains owned by repo-specific source documents and must not be invented by generic tooling.

---

# 1. Purpose

This addendum extends the Master Operating Contract to govern the universal repo lifecycle now supported by the local tool estate:

- generic testing-architecture audit and scaffold
- repo-specific testing and proof design
- Hallmark evidence collection and hostile UX review
- repo-owned Deep Validation
- diagnostics and proof evidence
- secret and encrypted-vault policy
- contract-driven v3.1 updater flow
- postpush and live-proof separation
- proof-fixture lifecycle and cleanup
- canonical operator handoff

The goal is one predictable operating model across repositories without collapsing product-specific behavior into generic tooling.

---

# 2. Authority hierarchy

For cross-repo work, authority is:

1. `Repo_and_Project_Instructions_Master_Operating_Contract.md`
2. This Extended Master Addendum
3. Repo-specific source documents
4. `_repo_update_contract.json`
5. Repo-owned testing architecture, validation matrix, runbooks, and package scripts
6. Runtime instructions and ad hoc chat guidance

Rules:

- Generic documents govern process.
- Repo-specific documents govern product truth.
- Machine-readable contracts govern executable release routing.
- Runtime may not reinterpret or weaken source documents.
- If the generic contract and repo-specific product behavior differ, the repo-specific document controls only that product behavior.
- Generic tooling may scaffold; it may not fabricate product semantics.

---

# 3. Simplified mental model

```text
GENERIC INSTALLER
Builds the testing frame
        ↓
REPO-SPECIFIC DESIGN
Defines the promises
        ↓
PRODUCT TESTS
Prove those promises locally
        ↓
HALLMARK
Audits the human experience
        ↓
DEEP VALIDATION
Runs everything safely possible before release
        ↓
V3.1
Applies and pushes the approved ZIP
        ↓
POSTPUSH
Checks GitHub and deployment
        ↓
LIVE PROOF
Checks real providers and production
```

This model is mandatory for explaining the system to the operator.

---

# 4. Architecture table

| Layer | Purpose |
|---|---|
| Generic installer | Gives a repo the standard testing skeleton |
| Repo-specific architecture | Defines what that product must prove |
| Hallmark audit | Defines whether the experience is coherent, usable, responsive, and brand-correct |
| Deep Validation | Proves everything safely possible before Terminal |
| v3.1 updater | Applies ZIP, validates, commits, and pushes |
| Postpush suite | Proves GitHub and deployment |
| Live-proof suite | Proves real providers and production behavior |

No layer may claim proof owned by another layer.

---

# 5. Canonical repo lifecycle

```text
NEW OR LEGACY REPO
        ↓
1. Generic installer audit
        ↓
2. Repo-specific testing and product-proof design
        ↓
3. Generic testing scaffold applied
        ↓
4. Product-specific tests implemented
        ↓
5. Hallmark UX/design evidence collection and expert audit
        ↓
6. Hallmark findings implemented
        ↓
7. Targeted browser proof
        ↓
8. Deep Validation
        ↓
REPO IS MIGRATION-COMPLETE
        ↓
9. Future baseline ZIP created
        ↓
10. v3.1 updater applies ZIP
        ↓
11. Repo-owned prepush suite runs
        ↓
12. Commit and push
        ↓
13. Postpush suite
        ↓
14. Live proof when required
```

Steps 1–8 are usually a one-time migration/setup sequence or a major redesign sequence.

Once migration-complete, normal future work usually starts with feature implementation, updates repo-specific tests, runs targeted Hallmark review if the UI changed materially, runs Deep Validation, creates the baseline ZIP, and then enters the v3.1 release path.

---

# 6. Universal tool authorities

Canonical local tools:

```text
~/repo-tools/active/install_generic_repo_testing_architecture.sh
~/repo-tools/active/run_hallmark_audit.sh
~/repo-tools/active/update_repo_from_zip_generic_v3_1.sh
~/repo-tools/active/update_repo_from_zip_generic_v3.sh
~/repo-tools/active/update_lkg_from_zip.sh
```

Stable commands:

```text
~/install_generic_repo_testing_architecture.sh
~/run_hallmark_audit.sh
~/update_repo_from_zip_generic_v3_1.sh
~/update_repo_from_zip_generic_v3.sh
~/update_lkg_from_zip.sh
```

Rules:

- LKG remains governed by `update_lkg_from_zip.sh`.
- Generic v3 remains preserved for legacy-compatible flows.
- Generic v3.1 is the preferred contract-driven updater.
- No repo-specific updater wrapper may compete with v3.1 unless explicitly approved as an exception.
- Testing architecture behavior belongs inside the repo, not inside the updater.
- Hallmark evidence collection is read-only.
- No universal Hallmark auto-fix script is authorized.

---

# 7. Generic installer law

The generic installer provides infrastructure only.

Canonical audit:

```bash
~/install_generic_repo_testing_architecture.sh \
  /path/to/repo \
  --audit-only \
  --capability all-safe
```

Canonical apply:

```bash
~/install_generic_repo_testing_architecture.sh \
  /path/to/repo \
  --apply \
  --capability all-safe
```

The installer may provide:

- `_repo_update_contract.json`
- testing architecture scaffold
- diagnostics standard
- container-safe Playwright profile
- environment doctor
- Deep Validation runner
- prepush/postpush wrappers
- fixture standard
- secret policy
- test-env lifecycle
- safe GitHub Actions scaffold where requested

The installer must not invent:

- business journeys
- auth roles
- provider semantics
- persistence meaning
- cleanup rules for real data
- product-specific fixtures
- Master Gauntlet journeys
- live-provider proof claims
- product acceptance criteria

Audit-only and dry-run must leave the repo unchanged.

Apply must:

- require a clean repo
- preflight all selected capabilities
- preserve authored files
- replace only installer-owned generated files when explicitly allowed
- maintain external audit/backups
- roll back partial writes on failure
- remain idempotent after the first migration is committed

---

# 8. Repo-specific architecture law

Every non-trivial repo must define what the product must prove.

Required repo-owned surfaces scale by complexity and may include:

```text
TESTING_ARCHITECTURE.md
REPO_VALIDATION_MATRIX.md
MASTER_GAUNTLET.md
PREDEPLOY_POSTDEPLOY_RUNBOOK.md
REAL_RUNTIME_PROOF_MATRIX.md
DIAGNOSTICS_STANDARD.md
TEST_FIXTURE_LIFECYCLE.md
SECRETS_AND_VAULT_ARCHITECTURE.md
ARCHITECTURAL_DECISIONS.md
_repo_update_contract.json
tests/
scripts/testing/
```

Repo-specific architecture must define:

- users/personas
- critical journeys
- valid state transitions
- persistence/readback rules
- auth and permission boundaries
- provider contracts
- failure behavior
- fixture ownership
- cleanup behavior
- proof layers
- environment requirements
- completion criteria

A generic test skeleton is not product proof.

---

# 9. Testing tier law

Every test and validator must declare one primary proof layer.

## Tier 1 — Static and structural assurance

Includes:

- typecheck
- lint
- production build
- source contracts
- security pattern checks
- documentation consistency
- validator admission
- matrix consistency
- artifact and ZIP checks
- generated-folder exclusion
- secret-pattern checks

Tier 1 may not claim runtime behavior.

## Tier 2 — Local behavioral and integration assurance

Includes:

- unit logic
- API handlers
- provider-shaped local adapters
- normalization
- state transitions
- persistence logic
- error mapping
- idempotency
- cleanup selection and refusal logic

## Tier 3 — Local browser and full-journey assurance

### Tier 3A

Mocked deterministic browser journeys.

### Tier 3B

Local full-stack journeys with provider-independent durable adapters and fresh readback.

## Tier 4 — Live provider and deployed runtime proof

Includes:

- real providers
- real deployment
- cross-instance concurrency
- deployed auth
- postdeploy browser journeys
- GitHub Actions state
- cleanup verification

Passing in one tier never proves another.

---

# 10. Deep Validation law

Deep Validation is repo-owned.

It is not a universal home-directory script.

The generic installer may create:

```text
scripts/testing/deep-validation.sh
```

and a package command such as:

```json
{
  "scripts": {
    "deep-validation": "bash scripts/testing/deep-validation.sh"
  }
}
```

Canonical execution:

```bash
npm run deep-validation
```

or the package-manager equivalent.

Deep Validation must know and orchestrate the repo’s:

- package manager
- admitted validators
- build command
- fixture adapters
- browser configuration
- secret policy
- product-specific tests
- Master Gauntlet
- diagnostics standard
- artifact hygiene rules

Default proof target:

```text
Tier 1
↓
Tier 2
↓
Tier 3A
↓
provider-independent Tier 3B
↓
Local Master Gauntlet
↓
production build
↓
artifact hygiene
↓
proof summary
```

Deep Validation must not claim:

- live Gmail or Sheets proof
- live payment/provider proof
- Cloudflare or other deployment proof
- GitHub Actions proof
- postdeploy concurrency proof
- production callback proof

Unavailable live dependencies are `ENVIRONMENT GAP`, not product failure.

The assistant must run every safe, non-secret-dependent internal check available before operator handoff.

---

# 11. Browser portability law

Browser-capable repos should support:

- headless Chromium baseline
- `127.0.0.1` base URL
- self-spawned test server
- safe test environment
- container-safe launch arguments
- lower worker count
- screenshots on failure
- traces on failure
- video on failure where useful
- environment doctor
- deterministic fixtures
- no production-credential requirement for fixture/local modes

Required provider modes should be explicit:

```text
fixture
local-adapter
live-provider
```

No test may silently switch modes.

Headed local review remains distinct from container/headless proof.

---

# 12. Diagnostics law

Diagnostics are not optional decoration.

All Tier 3 failures and all Tier 4 runs must generate run-scoped evidence.

Canonical path:

```text
artifacts/diagnostics/<run_id>/<test_id>/
```

Required where applicable:

- `summary.json`
- `runtime-context.json`
- `request-metadata.json`
- `response-metadata.json`
- `console.log`
- `network.json`
- `persistence-readback.json`
- `provider-evidence.json`
- screenshots
- Playwright trace
- cleanup report

Every summary must identify:

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

Standard failure categories:

```text
AUTH_FAILURE
PERMISSION_FAILURE
PROVIDER_FAILURE
RATE_LIMIT
TIMEOUT
DUPLICATE_WRITE
STALE_READBACK
CLASSIFICATION_FAILURE
MAINTENANCE_FAILURE
DEPLOYMENT_FAILURE
ENVIRONMENT_GAP
UI_REGRESSION
CLEANUP_FAILURE
TEST_HARNESS_FAILURE
```

Diagnostics must never expose plaintext secrets, raw tokens, cookies, unnecessary PII, or private provider payloads.

Logs over vibes. Evidence over confidence.

---

# 13. Proof-fixture lifecycle law

Every durable live proof fixture must carry:

- `proof_run_id`
- `proof_test_id`
- `proof_fixture: true`
- `proof_created_at`
- `proof_cleanup_policy`
- `proof_expires_at`

Every run must create a fixture ledger containing:

- provider
- entity type
- stable entity ID
- creation result
- cleanup action
- cleanup status
- cleanup evidence

Cleanup must:

- target exact registered identifiers
- run in `finally` semantics
- verify provider and application state
- avoid fuzzy names
- avoid deleting legitimate records
- fail the proof when incomplete

Required result on cleanup failure:

```text
PROOF FAILED — CLEANUP INCOMPLETE
```

Fixture cleanup is part of proof completion, not postscript housekeeping.

---

# 14. Secret and vault policy law

Every repo must declare one secret-management state in `_repo_update_contract.json`:

```text
vault_required
vault_preferred
plaintext_legacy
```

## vault_required

Required for high-risk, provider-integrated, authenticated, money-related, customer-data, admin, or production-credential repos unless explicitly overridden.

Rules:

- encrypted vault architecture required
- repo-owned doctor/materialize/cleanup hooks required
- plaintext real env files forbidden
- live/provider proof blocked without vault lifecycle
- temporary materialization only
- cleanup failure blocks proof

## vault_preferred

Allowed for lower-risk or migrating repos.

Rules:

- fixture/local proof may continue
- live-provider proof requires approved secret handling
- migration warning must be documented

## plaintext_legacy

Temporary exception only.

Rules:

- approved exception required
- no committed secrets
- no raw secret logs
- migration target documented
- high-risk repos should not remain here

Canonical test secret modes:

```text
fixture
vault-test
live-provider
```

The generic installer may scaffold lifecycle hooks but may not invent a vault provider.

---

# 15. Hallmark authority law

Canonical Hallmark reference authority:

```text
~/AI_REFERENCE_LIBRARIES/hallmark-reference.zip
```

Tool-estate access path:

```text
~/repo-tools/reference-authorities/hallmark/hallmark-reference.zip
```

Canonical runner:

```text
~/run_hallmark_audit.sh
```

The runner is an evidence-pack generator, not an autonomous expert audit engine.

`--self-test` verifies the tool and authority bundle. It does not prove the product passed a Hallmark audit.

Required operating sequence:

```text
Hallmark evidence pack
        ↓
Expert hostile UX review
        ↓
Repo-specific findings
        ↓
Approved implementation plan or addendum
        ↓
Repo changes
        ↓
Targeted browser proof
        ↓
Deep Validation
```

For major repos, create:

```text
HALLMARK_UX_AUDIT_AND_REMEDIATION_PLAN.md
```

For an existing repo master plan, prefer:

```text
<REPO>_HALLMARK_UX_ADDENDUM.md
```

Hallmark must preserve declared:

- brand colors
- logos and wordmarks
- brand typography
- imagery direction
- named design tokens
- intentional cultural or visual references

If a brand constraint causes a genuine issue, classify it as:

```text
BRAND-CONSTRAINED
```

Do not silently replace approved branding.

Full Hallmark audit is appropriate for:

- new apps
- major redesigns
- navigation changes
- major workflow additions
- dashboards
- mobile redesigns
- design-system migrations

Targeted Hallmark audit is appropriate for:

- a new route
- one workflow
- settings
- forms
- dialogs
- meaningful UI changes

Backend-only or trivial non-UI changes do not require a full Hallmark audit.

No universal Hallmark auto-fix script is authorized.

---

# 16. `_repo_update_contract.json` law

Repos using v3.1 must own a machine-readable update contract.

Minimum fields:

```json
{
  "schema_version": 1,
  "repo_name": "example-repo",
  "expected_branch": "main",
  "package_manager": "npm",
  "commands": {
    "prepush": "npm run release:prepush",
    "postpush": "npm run release:postpush",
    "live_proof": "npm run release:live-proof",
    "cleanup": "npm run fixtures:cleanup:expired"
  },
  "secrets": {
    "mode": "vault_preferred",
    "provider": "repo_defined",
    "required_hooks": {
      "doctor": "",
      "materialize": "",
      "cleanup": ""
    }
  }
}
```

The contract must reflect commands that actually exist.

It may not claim:

- a Master Gauntlet that is not implemented
- live proof that is not implemented
- vault support that is not implemented
- cleanup that is not implemented
- postpush deployment proof that is not implemented

---

# 17. v3.1 updater law

Canonical generic contract-driven updater:

```text
~/update_repo_from_zip_generic_v3_1.sh
```

Canonical invocation:

```bash
~/update_repo_from_zip_generic_v3_1.sh \
  ZIP_PATH \
  REPO_PATH \
  snapshot \
  REPO_NAME
```

v3.1 responsibilities:

- validate required arguments
- verify repo identity
- verify clean worktree
- verify ZIP name
- test ZIP integrity
- reject unsafe archive paths
- reject archive symlinks unless explicitly allowed
- reject secret-bearing filenames
- detect unambiguous ZIP root
- verify contract repo name
- verify expected branch
- verify origin slug
- create safety tag
- perform snapshot dry-run
- guard large deletions
- preserve excluded local secret files
- install dependencies from lockfile
- run contract-declared prepush command
- stop before commit/push on failure
- commit and push on pass
- create post-update safety tag
- preserve evidence logs
- print exact postpush, live-proof, and cleanup commands

v3.1 does not:

- design tests
- invent validation
- run destructive live proof automatically
- replace repo-specific architecture
- replace Hallmark review
- bypass the validation matrix

No repo-specific wrapper should duplicate v3.1 behavior unless explicitly approved.

The original v3 remains available for legacy flows.

---

# 18. Prepush law

Every migration-complete repo should expose one canonical prepush command.

Preferred:

```text
release:prepush
```

Prepush may orchestrate:

- environment/secret contract
- Tier 1
- Tier 2
- critical local Master Gauntlet
- production build
- deployment-target build where safe
- artifact hygiene
- documentation/matrix consistency
- secret exposure check
- proof summary

The updater must not require the operator to run twenty commands manually.

Prepush outcomes:

```text
PREPUSH PASSED
PREPUSH PASSED WITH WARNINGS
PREPUSH BLOCKED
```

Blockers stop commit and push.

---

# 19. Postpush law

Canonical command:

```text
release:postpush
```

Postpush proves only what it actually checks.

It should verify, where applicable:

- current commit SHA
- GitHub Actions existence
- workflow status
- workflow conclusion
- deployment existence
- deployed route smoke
- auth boundaries
- provider-health smoke
- critical deployed browser journeys

Postpush must not silently trigger destructive live-provider proof.

Postpush outcomes:

```text
POSTDEPLOY PROOF PASSED
POSTDEPLOY PROOF PASSED WITH WARNINGS
POSTDEPLOY PROOF FAILED
POSTDEPLOY PROOF INCOMPLETE
```

A pushed commit is not deployed proof.

A successful workflow is not provider proof.

---

# 20. Live-proof law

Canonical command:

```text
release:live-proof
```

Live proof is guarded and explicit.

It may prove:

- real provider classification
- real ingestion
- real persistence
- real maintenance
- deployed concurrency
- production browser journeys
- cleanup verification

Live proof requires:

- approved secret mode
- unique proof run ID
- registered fixtures
- provider evidence
- diagnostics
- cleanup in `finally`
- cleanup verification

Ordinary CI must not run destructive provider proof automatically.

---

# 21. GitHub Actions law

When Actions exist, verification is default.

Workflows should be separated by proof burden:

- validation
- predeploy
- deploy
- postdeploy smoke
- manually protected live-provider proof
- release-proof aggregation

CI must not claim deployed runtime behavior unless it actually reaches and verifies the deployed runtime.

Workflow status must be tied to the current commit SHA.

---

# 22. Hallmark and Deep Validation interaction law

Hallmark and Deep Validation are complementary.

Hallmark asks:

- is the experience coherent?
- is it usable?
- is it responsive?
- are states understandable?
- does it preserve brand?
- does it avoid generic AI slop?

Deep Validation asks:

- does the repo behave correctly?
- do tests pass?
- do local journeys work?
- does persistence/readback hold?
- does the build succeed?
- are artifacts clean?
- are diagnostics complete?

Hallmark evidence or screenshots do not replace behavioral tests.

Behavioral tests do not replace expert UX judgment.

A screenshot is not human review.

---

# 23. Migration-complete definition

A repo is migration-complete only when:

- generic installer audit completed
- repo-specific testing architecture defined
- required scaffold applied
- product-specific tests implemented to the required depth
- validation matrix is current
- diagnostics architecture exists
- secret mode is declared
- Hallmark review completed when applicable
- approved Hallmark findings implemented
- targeted browser proof completed
- Deep Validation completed to the highest available safe layer
- `_repo_update_contract.json` is accurate
- prepush command exists and passes
- baseline ZIP is packaged and reopened
- v3.1 release route is ready

Migration-complete does not mean live-provider proof has passed unless that layer was actually run.

---

# 24. Normal future feature flow

For ordinary future work:

```text
1. Implement feature
2. Update repo-specific tests
3. Update validation matrix if proof burden changed
4. Run targeted Hallmark review if UI changed materially
5. Implement approved UX findings
6. Run targeted browser tests
7. Run Deep Validation
8. Package full baseline ZIP
9. Reopen and structurally verify ZIP
10. Run v3.1 updater
11. Repo-owned prepush runs
12. Commit and push
13. Run postpush
14. Run live proof only when required
```

Backend-only changes may skip Hallmark unless they alter user-visible states, errors, latency perception, or workflow behavior.

---

# 25. Handoff minimization law

The assistant should perform every safe internal check before operator handoff.

Operator handoff should contain:

- what was proven internally
- what remains unproven
- exact reason
- one canonical next command
- expected result
- evidence to return only if failure occurs

Do not ask the operator to rerun checks already proven in the same artifact unless the updater contract requires them as enforcement.

Terminal Mode remains one command at a time.

---

# 26. Documentation law

Generic docs define process.

Repo-specific docs define product truth.

Avoid duplicate documents that restate the same architecture.

When replacing older docs:

- consolidate
- archive superseded docs
- update indexes
- preserve architectural decisions
- do not silently delete authority

Recommended generic repo documentation after migration:

```text
TESTING_ARCHITECTURE.md
REPO_VALIDATION_MATRIX.md
MASTER_GAUNTLET.md
PREDEPLOY_POSTDEPLOY_RUNBOOK.md
REAL_RUNTIME_PROOF_MATRIX.md
DIAGNOSTICS_STANDARD.md
TEST_FIXTURE_LIFECYCLE.md
SECRETS_AND_VAULT_ARCHITECTURE.md
ARCHITECTURAL_DECISIONS.md
ARTIFACT_MANIFEST.md
```

Use only the documents appropriate to the repo’s complexity.

---

# 27. Validator simplification law

Keep validators that protect:

- security
- data integrity
- deployability
- provider contracts
- artifact safety
- matrix consistency

Merge overlapping validators.

Demote or remove:

- exact wording checks
- stale date checks
- duplicated token checks
- validators that merely restate package scripts
- checks with no real production-risk mapping

Every validator must declare:

- tier
- severity
- proof boundary
- diagnostics
- failure handling
- matrix owner

Static validators may not claim runtime proof.

---

# 28. Acceptance criteria for this addendum

This addendum is active when:

1. The simplified mental model is used consistently.
2. The architecture table is included in generic repo education.
3. The canonical repo lifecycle is followed.
4. The generic installer is treated as scaffold, not product truth.
5. Repo-specific architecture defines actual promises.
6. Hallmark evidence collection is not mislabeled as a completed audit.
7. Brand constraints are preserved.
8. Deep Validation remains repo-owned.
9. Diagnostics are required for runtime proof.
10. Vault policy is declared.
11. Proof fixtures are registered and cleaned.
12. v3.1 reads `_repo_update_contract.json`.
13. Prepush blocks unsafe commit/push.
14. Postpush and live proof remain separate.
15. No competing repo-specific updater is created by default.
16. The operator is not asked to run long manual command chains.
17. Completion claims identify the exact proof layer.
18. Environment gaps are not mislabeled as product failures.

---

# 29. Final laws

Generic tooling builds the frame.  
Repo-specific architecture defines the truth.  
Hallmark evaluates the human experience.  
Deep Validation proves the maximum safe local layer.  
v3.1 transports, validates, commits, and pushes.  
Postpush proves GitHub and deployment.  
Live proof proves real providers and production.  
Diagnostics explain failures.  
Fixture cleanup is part of proof.  
Vault policy is explicit.  
No universal tool may invent product semantics.  
No screenshot is human review.  
No mock is production.  
No workflow success is deployed proof unless deployment was checked.  
No success response is persistence proof without readback.  
No cleanup failure may be ignored.  
No repo-specific updater wrapper competes with v3.1 by default.  
No fake COMPLETE.
