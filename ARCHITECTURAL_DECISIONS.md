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

