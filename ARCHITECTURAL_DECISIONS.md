# Architectural Decisions

## ADR-001 — Cloudflare app surface

Use Vite + React for the frontend and Cloudflare Pages/Functions for deployment.

## ADR-002 — West Peek Network product language

The app calls the relationship database the **West Peek Network**. The primary action is **Add to West Peek Network**. CRM/database/lead language is avoided in user-facing surfaces.

## ADR-003 — Gmail ingestion

Use Google OAuth + Gmail API, not Google Apps Script. Gmail trigger emails route to Intake Queue first.

## ADR-004 — Canonical triggers

Primary trigger: `#wpnetwork`. Accepted aliases: `#addtowestpeek`, `#westpeeknetwork`. Do not use `#westpeekcrm` as canonical language.

## ADR-005 — Persistence

Use Google Sheets for V1 CRM data. Use safer server-side storage for raw OAuth token material. Sheets can store token metadata/status, not raw refresh tokens.

## ADR-006 — AI relationship assistant

Use an app-owned workflow layer powered by Claude/Anthropic. Twin is not the core system. AI drafts/suggests/prepares. Human approval is required for sensitive execution.

## ADR-007 — Approval gates

Internal human approval is required before sending emails, submitting handwritten notes, ordering gifts, merging contacts, deleting contacts, changing ownership, or changing admin/security settings.

## ADR-008 — Notifications are not approvals

Notification links must open authenticated app pages. No one-click email approvals in V1.

## ADR-009 — Secrets simplicity

Use one encrypted local secrets bundle: `secrets/network-os.local.env.gpg`. Operators use the approved West Peek vault passphrase; the passphrase value is not stored in repo docs, scripts, or examples. Production secrets are stored in Cloudflare secret/environment settings and can be pushed by script.

## ADR-010 — Internal Team launchpad

`joinwestpeek.com/team` uses a simple shared password gate: `3021WPeek`. Anyone with the password can access tools behind that Team page.

## Decision ID: ADM-2026-06-10-INTAKE-DATABASE-UPsert
Date: 2026-06-10
Status: Accepted

Context:
Pitch Lab, event forms, founder forms, and future Network OS forms need one source of truth for self-submitted relationship data. The prior language around “no contact auto-creation” conflicted with the requirement that self-submitted people enter the Network OS database immediately.

Decision:
Self-submitted intake automatically upserts or links a database-backed profile by email and appends an intake event. Human review applies only to downstream actions, routing, outreach, invitations, intros, publishing, or external communication.

Alternatives Considered:
1. Store only in intake queue until review.
2. Send email notifications.
3. Create profiles immediately but block all actions.

Reasoning:
Network OS is the database of record. Intake persistence should be durable and automatic, while operator action remains review-gated.

Tradeoffs:
The profile table may contain self-submitted people before any human has reviewed quality or fit. This is acceptable because `execution_allowed=false` and review status separates storage from action.

Risks Accepted:
Duplicate or low-quality profiles may be created from self-submission. Email-based upsert and linked intake events reduce this risk.

Validation Impact:
`test:pitchlab-profile-lead`, `test:pitchlab-handoff`, and `test:event-database-intake` are hard-fail validation lanes. `npm run validate:all` now includes `npm run build`.

Future Reversal Conditions:
Only reverse if Network OS gains a stronger canonical person table with explicit pending-profile state that still counts as database-backed persistence and does not require approval before storage.


## Decision ID: ADM-2026-06-11-TRIGGER-PROOF
Date: 2026-06-11  
Status: Accepted

Context: The app's core value depends on `#wpnetwork`, `#addtowestpeek`, `#westpeeknetwork`, `#wpdealflow`, and `#dealflow` trigger ingestion. Generic intake validation can miss these product promises.

Decision: Trigger behavior is now governed by `REPO_PRODUCT_PROMISE_LEDGER.md`, `_repo_validation_matrix.json`, and `npm run validate:triggers`. Live Gmail ingestion remains a separate provider proof lane and must be labeled UNPROVEN when not run.

Alternatives Considered: Keep trigger proof inside broad Playwright tests only.

Reasoning: Broad E2E names are too easy to miss during future rework. Product-critical promises need their own proof row.

Tradeoffs: More explicit validation surface.

Risks Accepted: Live Gmail proof still requires real provider credentials and cannot be inferred from local tests.

Validation Impact: `validate:everything` now includes trigger product promise proof.

Future Reversal Conditions: If Gmail ingestion is replaced by another provider, this decision must be superseded with an equivalent provider-specific trigger proof ledger.
