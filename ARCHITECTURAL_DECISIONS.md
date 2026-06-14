# Architectural Decisions

## Tier 4 introduction

User approved introducing Tier 4 for `west-peek-network-os` as the final postdeploy live E2E provider + data proof layer.

Predeploy validation proves Tier 4 readiness. Postdeploy strict proves deployed smoke/safety. Tier 4 proves live provider/data behavior.

## Google private key parsing

Google service-account private-key parsing is centralized in `functions/_shared/googlePrivateKey.ts` so malformed keys return `GOOGLE_PRIVATE_KEY_INVALID_FORMAT` instead of leaking raw `atob()` runtime errors.

## ADR-2026-06-13-UX-01 — Operator action state and fresh readback

**Status:** Accepted

**Context:** Mutations were followed by a cached Sheets snapshot, leaving completed records visible and encouraging duplicate clicks.

**Decision:** Every operator-triggered mutation and explicit Settings refresh requests `/api/sheets/snapshot?fresh=1`. Intake, approvals, contacts, and event lifecycle controls expose entity-scoped pending state and disable conflicting actions while a request is active.

**Tradeoffs:** Fresh reads cost additional Sheets quota. The operator trust and data-integrity benefit outweighs the extra read burden for human-triggered actions.

**Validation impact:** Build, static contract checks, persistence/readback E2E, and postdeploy Sheets proof are required.

## ADR-2026-06-13-UX-02 — Shared founder mailbox is a separate monitored account

**Status:** Accepted

**Context:** Signed-in operator identity and monitored mailbox identity were conflated. `info@westpeek.ventures` needs automatic founder inquiry capture without changing personal mailbox trigger rules.

**Decision:** Gmail sync selects an explicit OAuth token owner as the mailbox identity. Personal accounts remain `trigger_only`. `info@westpeek.ventures` uses `founder_inquiry`, searches its inbox, and creates deal-flow Intake rows requiring human review. It must be connected separately.

**Tradeoffs:** Shared mailbox OAuth setup remains an operator action. No mailbox is silently monitored.

**Validation impact:** Duplicate ingestion, untagged shared-inbox capture, disconnected-mailbox failure, and persistence/readback tests are required.

## ADR-2026-06-13-UX-03 — Append-only archive and revocation lifecycle

**Status:** Accepted

**Context:** Contacts and public event forms lacked safe removal workflows.

**Decision:** Contact archive/restore and event-form revoke/restore append a new row with the same entity ID. Default views show active entities only; history remains recoverable.

**Validation impact:** Active removal, history visibility, restore, refresh persistence, and revoked public-form rejection require E2E proof.

## ADR-2026-06-13-INTELLIGENT-INBOX

Decision ID: ADR-2026-06-13-INTELLIGENT-INBOX
Date: 2026-06-13
Status: Accepted

Context: `info@westpeek.ventures` receives pitches, company information, relationship messages, and operational noise. Importing every inbox item as deal flow creates false positives; requiring hashtags misses legitimate inbound opportunities.

Decision: Use a lightweight deterministic weighted classifier inside the existing Gmail sync endpoint. Capture pitch, company-information, and relevant relationship messages for human review; skip obvious operational and marketing noise. Preserve review-only execution boundaries.

Alternatives Considered: Import all messages; require triggers; add an external AI classification service; introduce a database queue.

Reasoning: Weighted deterministic rules improve relevance without a new provider, schema migration, or major refactor. They are inspectable and testable.

Tradeoffs: Rules can still misclassify ambiguous messages. Human review remains mandatory. Cross-region atomic deduplication is not guaranteed by Google Sheets.

Risks Accepted: Some borderline messages may be skipped or captured incorrectly. Sync response telemetry and live evidence are required to tune thresholds.

Validation Impact: Typecheck/build plus provider contract tests; live Gmail duplicate and classification evidence remains Tier 4.

Future Reversal Conditions: Move to a durable ingestion ledger or AI classifier only if message volume or false-positive/false-negative evidence justifies the added architecture.


## ADR-2026-06-13-PROOF-BOUNDARIES

Decision ID: ADR-2026-06-13-PROOF-BOUNDARIES  
Date: 2026-06-13  
Status: Accepted

Context: Release reports listed static validators, build checks, documentation checks, and artifact checks beside live runtime gaps, creating a risk that structural assurance would be interpreted as real-life proof.

Decision: Lock seven missing live-proof lanes in `PROOF_COMPLETION_MASTER_PLAN_2026-06-13.md` and require every validation claim to name its proof layer. Typecheck, build, static contracts, documentation governance, and ZIP checks remain valid but may not be represented as provider, deployed, browser, persistence, or concurrency proof.

Alternatives Considered: Continue using a single undifferentiated pass/fail list; remove static validators; run every live provider test in normal CI.

Reasoning: Layer-specific evidence preserves useful guardrails without overstating them. Live provider tests require guarded credentials and durable readback; static checks remain important predeploy gates.

Tradeoffs: Release reports become slightly more explicit. Some existing test names may need future renaming to match their actual proof depth.

Validation Impact: Matrix rows and reports must state what each check proves and does not prove. The seven live lanes remain NOT PROVEN until executed successfully.

Future Reversal Conditions: None. Proof-layer honesty is permanent; only individual test implementations may deepen their proof class.

## ADR-2026-06-13-07 — Explicit Provider Modes and Local Proof Adapters

**Status:** Accepted

**Decision:** West Peek Network OS uses exactly three provider modes: `fixture`, `local-adapter`, and `live-provider`. Fixture and local-adapter modes are forbidden in production. The local Sheets adapter is durable, serializes concurrent writes, performs exact idempotency checks, supports fresh readback, maintenance idempotency, and proof cleanup. The Gmail fixture provider uses the same normalized Gmail contract as the live route.

**Reasoning:** Provider-independent proof must be deterministic and runnable in containers without weakening or impersonating production integrations.

**Validation impact:** `npm run test:provider-architecture` and `npm run test:gauntlet:local` are Tier 2/3B hard gates inside `verify:fast` and Deep Validation.

## ADR-2026-06-13-08 — Isolated Test Authentication

**Status:** Accepted

**Decision:** Test authentication requires `AUTH_PROVIDER=test`, `APP_ENV=test`, and a localhost/test hostname. Production or non-local activation throws a security error. Test personas never use production OAuth tokens.

**Validation impact:** Typecheck and provider architecture integration tests prove activation and production exclusion contracts. Live OAuth remains Tier 4.

## ADR-2026-06-13-09 — Playwright Self-Spawn Parity and Proof-Lane Separation

**Status:** Accepted

**Context:** Local Playwright timed out because the configured readiness URL used port 3000 while the spawned Vite command used its default port. The local container configuration also admitted live-production-only specs.

**Decision:** Every Playwright self-spawn command must explicitly bind to the same host and strict port as its configured `baseURL` and readiness URL. Local/container fixture lanes must exclude live-provider and deployed-runtime specs by filename policy.

**Reasoning:** Self-spawn parity is test infrastructure, not incidental configuration. Mixing Tier 4 specs into local fixture proof creates false failures and proof-layer ambiguity.

**Validation impact:** Environment doctor checks the same base URL and port. `playwright.container.config.ts` owns strict host/port startup and local test exclusions. Live provider specs remain in guarded Tier 4 commands only.


## Decision: Documentation validators are advisory only

**Decision ID:** ADR-2026-06-13-DOCS-NONBLOCKING  
**Date:** 2026-06-13  
**Status:** Accepted

**Context:** Documentation and release-metadata drift previously blocked an otherwise passing updater run after build, Deep Validation, browser proof, artifact hygiene, and fixture cleanup had passed.

**Decision:** Documentation-only validators may emit `STRONG WARNING` or `WARNING` only. They may never hard-fail build, browser proof, updater commit, push, or release. Validators that combine executable-contract checks with documentation checks must hard-fail only the executable/runtime/security/data-integrity portion and warn on prose/documentation drift.

**Tradeoffs:** Documentation can temporarily lag implementation, but release safety remains governed by repo identity, ZIP integrity, secrets, build, tests, runtime contracts, and deployment proof.

**Validation impact:** `validate:artifact-manifest-current`, `validate:docs-consolidation`, `validate:docs-match-package-scripts` documentation parity, `validate:tier-docs-current`, and `validate:tier4-docs-complete` are non-blocking.

**Future reversal conditions:** Only by explicit owner instruction changing the global documentation-severity law.

## 2026-06-13 — Hallmark global route remediation

- Preserve the West Peek black/white/cream/orange brand system.
- Apply observed Hallmark defect classes globally through shared shell, route guidance, form, record, action, and responsive patterns.
- Add route-specific hierarchy and copy based on actual route purpose and state model without fabricating unobserved product behavior.
- Use explicit mobile navigation; hidden navigation is not acceptable human wayfinding.
- Filter proof/test fixtures from normal operator surfaces.
- Keep semantic success/warning/error colors subordinate to the primary brand palette.
## 2026-06-13 — Hallmark global route refinement

The post-remediation Hallmark findings are applied as reusable route-level UX laws, not dashboard-only cosmetic fixes. All operational routes must expose identity, context, state, and next action; secondary mobile content may collapse; tablet/mobile navigation must use an explicit menu; and the West Peek black/white/cream/orange brand remains authoritative.


## 2026-06-13 — External authenticated browser-state vault

Decision: preserve Google-authenticated Playwright storage state as encrypted ciphertext outside the repo, with repo-owned atomic backup/restore/status wrappers. The disposable `.auth/` copy may be deleted by snapshot updates and recreated on demand. Tier 4 and Hallmark use the same validated state. This avoids repeated OAuth while preventing committed cookies or session material.

## ADR-AUTH-STATE-002 — First-run authenticated browser-state capture is repo-owned and reusable

- **Date:** 2026-06-13
- **Status:** Accepted
- **Context:** The encrypted auth-state vault could back up and restore an existing Playwright storage state, but the initial production-authenticated state still required an undocumented one-off `playwright codegen` command.
- **Decision:** Add `npm run auth:capture` as the canonical first-run and session-refresh workflow. It opens the deployed HTTPS app, saves to a temporary storage-state file, validates the required production session cookie/domain/expiry, atomically installs the repo-local `.auth` state, and refuses overwrite unless explicitly enabled. A generic repo-tools utility is maintained separately for reuse across repos.
- **Alternatives considered:** Manual one-off terminal command; Hallmark-specific capture; Tier-4-specific capture; committed auth fixtures.
- **Reasoning:** One shared capture path reduces operator friction, prevents drift between Hallmark and Tier 4, and keeps real session state out of Git and baseline ZIPs.
- **Tradeoffs:** Initial authentication remains interactive; Google or application session expiry still requires recapture.
- **Risks accepted:** Playwright codegen UI behavior may evolve; contract validation protects the command surface but live capture remains locally proven.
- **Validation impact:** Auth-state vault validator must require the capture script and package command. Synthetic capture tests verify overwrite refusal, validation, atomic install, and permissions.
- **Future reversal conditions:** Replace only if Playwright deprecates codegen storage capture or the app adopts a safer first-class programmatic auth bootstrap.

## Decision: Historical Tier 4 cleanup remains terminal-only

Decision ID: WP-NETWORK-CLEANUP-002
Date: 2026-06-13
Status: Accepted

Context:
Legacy Tier 4 fixtures from multiple historical run IDs remained in production after exact-run cleanup was introduced. A broad browser button would create avoidable accidental-cleanup risk.

Decision:
Keep routine exact-run cleanup available through Settings and terminal. Add a separate terminal-only historical sweep using a distinct confirmation phrase, one-tab bounded batches, strong Tier 4 marker matching, append-only terminal versions, no-progress aborts, and all-tab fresh verification.

Alternatives Considered:
- manual Google Sheet row deletion
- fuzzy matching on words such as founder, event, Gmail, or Pitch Lab
- a one-click Settings button for all historical test data

Reasoning:
Manual deletion is error-prone and destroys append-only history. Fuzzy matching risks legitimate production records. Terminal-only execution makes the exceptional broad scope explicit while preserving authenticated, repeatable verification.

Tradeoffs:
The operator must apply/deploy source changes and run one local authenticated command. Historical fixture types without a strong Tier 4 marker are intentionally not auto-selected.

Risks Accepted:
A legacy fixture with no recognizable Tier 4 marker may require narrow classifier expansion after human inspection.

Validation Impact:
Cleanup contract validator now requires historical scripts, confirmation phrase, documentation, no-progress behavior, and verification output. Live production behavior still requires postdeploy execution.

Future Reversal Conditions:
A dedicated privileged maintenance console may replace terminal-only execution if it provides equivalent preview, explicit confirmation, exact match evidence, bounded writes, and fresh readback.


## Authenticated Product Usability Addendum — 2026-06-13

This repository adopts `docs/REPO_MASTER_CONTRACT_ADDENDUM_AUTHENTICATED_PRODUCT_USABILITY_2026-06-13.md`. Route-complete authenticated usability, production-shaped rendering, control-to-persistence proof, refresh/re-entry, maintenance scale, post-cleanup audit, and route-complete Hallmark are distinct mandatory proof layers.

### Decision ID: ADM-2026-06-14-TRIGGER-SHEETS-01
* **Date:** 2026-06-14
* **Status:** Accepted
* **Context:** Gmail hashtag capture stopped producing visible Google Sheets records while parser, fixture, and source-presence tests remained green. Runtime header repair could reorder labels without migrating data, and cleanup allowed broad physical-row deletion.
* **Decision:** Make Sheets schema validation fail closed; prohibit silent header mutation; require append readback; query Gmail aliases independently with pagination; restrict cleanup to exact registered proof fixtures; require real deployed Gmail-to-Sheets mutation/readback/dedupe/cleanup proof before COMPLETE.
* **Alternatives Considered:** Preserve self-healing header rewrites; repair headers in place; retain historical fuzzy cleanup; continue treating mocked trigger tests as release proof.
* **Reasoning:** Silent repair can corrupt logical column meaning, fuzzy deletion can remove unrelated rows, and mocked tests cannot prove provider delivery or persistence.
* **Tradeoffs:** Schema drift now blocks writes and requires an explicit reset or versioned migration. Live release proof requires authenticated provider access.
* **Risks Accepted:** A malformed workbook becomes unavailable until deliberately repaired; this is safer than silent corruption.
* **Validation Impact:** `validate:sheets-schema-contract`, `test:trigger-sheet-safety`, `validate:tier4-cleanup-contract`, local prepush, and deployed provider proof are mandatory.
* **Future Reversal Conditions:** Only if a transactional, versioned migration system can prove data relocation, rollback, and readback without silent mutation.

### Decision ID: ADM-2026-06-14-TIER4-HISTORICAL-CLEANUP-01
* **Date:** 2026-06-14
* **Status:** Accepted
* **Context:** Operators may need to remove all Tier 4 proof data without knowing old run IDs. The previous historical script used broad textual signatures and was unsafe; removing it entirely left no usable historical purge path.
* **Decision:** Support an authenticated `all_registered_tier4` cleanup scope that selects only rows with `proof_fixture=true`, a canonical `wpno-tier4-*` run ID, a nonempty `proof_test_id`, and a stable record ID. Require dry-run manifest parity before execution and verify unrelated IDs are unchanged after physical deletion.
* **Alternatives Considered:** Keep historical cleanup unsupported; restore fuzzy text matching; require manual run-ID discovery.
* **Reasoning:** Explicit fixture metadata provides safe ownership without requiring the operator to remember historical run IDs.
* **Tradeoffs:** Unregistered legacy test rows cannot be automatically identified and require workbook reset or deliberate one-time migration.
* **Risks Accepted:** A malformed row missing fixture metadata will be preserved rather than risk deleting real data.
* **Validation Impact:** Cleanup contract validator, TypeScript, integration contract tests, live authenticated dry-run and execution readback.
* **Future Reversal Conditions:** Replace only if fixture ownership moves to a dedicated database registry with stronger transactional guarantees.


### Decision ID: ADM-2026-06-14-07
*   **Date:** 2026-06-14
*   **Status:** Accepted
*   **Context:** The canonical Tier 4 closure executed Sheets-heavy live lanes back-to-back and exceeded Google Sheets' 60 read requests per minute per user quota, causing deterministic `429 RESOURCE_EXHAUSTED` failures after earlier lanes had passed.
*   **Decision:** Enforce a default 65-second minimum gap between every Sheets-heavy Tier 4 lane. Permit configuration through `TIER4_SHEETS_COOLDOWN_MS` only when the value is at least 60000 milliseconds. Do not automatically retry failed mutation lanes because a quota failure may occur after a remote write but before readback.
*   **Alternatives Considered:** Immediate full-suite reruns; automatic 429 retries; weakening failed lanes to warnings; requesting higher provider quota as the only remedy.
*   **Reasoning:** Proactive pacing prevents quota exhaustion without masking provider failures, duplicating partially written fixtures, or requiring paid quota changes. It is deterministic and safe on the operator's 8GB MacBook Air.
*   **Tradeoffs:** Full Tier 4 closure takes several additional minutes.
*   **Risks Accepted:** A single lane that independently exceeds the quota still fails and requires targeted engineering repair.
*   **Validation Impact:** Existing `validate:tier4-live-proof-contract` must enforce the cooldown variable, minimum bound, Sheets-heavy lane declarations, and visible cooldown logging.
*   **Future Reversal Conditions:** Replace fixed spacing only after remote Sheets access is batched/cached sufficiently and live evidence proves the full suite remains below provider quotas.



### Decision ID: ADM-2026-06-14-03
* **Date:** 2026-06-14
* **Status:** Accepted
* **Context:** Exact fixture cleanup could verify zero owned records while fully blank physical Sheet row shells remained; Pitch Lab proof could become unproven when `.env.local` existed but was not sourced.
* **Decision:** Add explicit confirmation-gated blank-row physical compaction using `deleteDimension`, and load only selected missing Tier 4 provider keys from gitignored `.env.local`.
* **Alternatives Considered:** Broad workbook reset; fuzzy historical deletion; requiring manual shell sourcing forever.
* **Reasoning:** Preserves all nonblank data, keeps destructive compaction operator-authorized, and removes avoidable secret-loading friction without printing secrets.
* **Tradeoffs:** Compaction removes intentional fully blank spacer rows beneath headers when explicitly confirmed.
* **Risks Accepted:** Operator must understand the confirmation phrase is destructive to blank row spacing, though not to populated records.
* **Validation Impact:** Cleanup contract, Tier 4 live-proof contract, TypeScript, build, and reopened-artifact checks must pass.
* **Future Reversal Conditions:** Replace with provider-native row ownership metadata if Google Sheets exposes attributable blank-row provenance.
