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

Use one encrypted local secrets bundle: `secrets/network-os.local.env.gpg`. Password/passphrase: `3021WPeek`. The password is not embedded in scripts. Production secrets are stored in Cloudflare secret/environment settings and can be pushed by script.

## ADR-010 — Internal Team launchpad

`joinwestpeek.com/team` uses a simple shared password gate: `3021WPeek`. Anyone with the password can access tools behind that Team page.
