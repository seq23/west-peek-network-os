# West Peek Network OS — Security Model

Status: ACTIVE  
Updated: 2026-06-11

## Product classification

Private internal relationship intelligence app with public signed/public-intake edges.

## Private surfaces

The React app shell, dashboard, settings, live spreadsheet hints, intake queue, contacts, touchpoints, approvals, notifications, AI Helper tools, and maintenance actions are private operator surfaces.

Unauthenticated browser visitors must not see the private app shell.

## Public surfaces

Allowed public routes:

- `/auth/google`
- `/auth/callback/google`
- `/api/health`
- `/api/session` status only, no allowlist disclosure
- `/api/triggers/check`
- `/api/intake/pitch-lab`
- `/api/intake/pitch-lab-profile`
- `/e/*` public event forms
- required static assets

## Session policy

Production auth uses Google OAuth allowlist and the signed `wpn_session` cookie.

`x-west-peek-user-email` is not accepted as production authentication.

## Secret phrase policy

Shared team passwords, vault passphrases, OAuth secrets, API keys, service-account keys, webhook secrets, and provider tokens must not be committed or displayed in UI/docs.

Allowed wording: `stored only in owner password manager`.

## Signed endpoint policy

Pitch Lab requests require:

- `x-pitch-lab-submitted-at`
- `x-pitch-lab-signature`
- base64url HMAC-SHA256 over `${submittedAt}.${rawBody}`
- timestamp freshness
- replay guard
- optional origin allowlist

## Execution guardrail

No Gmail trigger, Pitch Lab handoff, public event form, Claude suggestion, OCR result, voice transcript, touch draft, or approval notification may send email, order a vendor item, create a final external action, or execute outreach automatically.

## Header spoofing control

Header spoofing is not accepted for production authentication.

## Guardrail literal

Provider-created rows must preserve execution_allowed=false unless explicitly reviewed by a human.

### In-app introduction email

A suggested pair has no send authority. The receiving person's assigned relationship owner must approve the exact edited email. For an investor or LP, the operator first sends a permission request only to that person; the operator explicitly records the person's agreement before the introduction to both recipients is enabled. The browser confirms the final send and the server rechecks recipient addresses, active contacts, approval, Gmail scope, and the operator's own token. The operator is limited to ten completed introductions per UTC day. The separate `west-peek-intro-send-guard` Durable Object owns a permanent one-use claim per introduction and stage. A missing binding disables sending. A Gmail timeout or lost response is treated as uncertain and cannot trigger an automatic retry; reconcile the deterministic RFC Message-ID in Gmail Sent manually. The send route does not accept client-supplied recipients or message text.

Deployment order: deploy `workers/intro-send-guard` with its migration, bind it to Pages as `INTRO_SEND_GUARD`, add the `introductions` sheet tab with the exact schema, then deploy Pages. Operators must reconnect Google to grant `gmail.send`. Verify using a controlled inbox and an approved introduction before enabling real use. Rollback: remove or disable the binding to stop new sends immediately, revoke the Gmail send grant in Google, and reconcile any `send_uncertain` records using Gmail Sent. Never reset a guard claim to retry an ambiguous send.
