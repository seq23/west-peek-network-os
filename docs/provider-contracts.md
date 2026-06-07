# Provider Contracts

These are explicit provider boundaries. This baseline does not claim runtime proof for external providers until secrets and provider credentials are configured and validation is run.

## Google OAuth

Purpose: authenticate approved users and connect Gmail access.

Required behavior: least-privilege scopes, server-side token handling, disconnect/revoke flow, approved email allowlist enforcement, role-aware sessions.

## Gmail API

Purpose: search for canonical triggers and ingest matching messages into Intake Queue.

Recognized triggers: `#wpnetwork`, `#addtowestpeek`, `#westpeeknetwork`.

Supported capture situations: sent email to contact, received thread, forwarded email, self-email/internal note, reply-to-self after sending external email.

Required behavior: sync status, last synced timestamp, error handling, duplicate Gmail message prevention, revoked-token handling, no direct final contact creation.

## Google Sheets API

Purpose: temporary V1 persistence layer for West Peek Network data.

Required behavior: stable schema, schema validation, append/update/read behavior, safe failure states, missing-column detection, no raw OAuth refresh token storage.

## Claude / Anthropic API

Purpose: summaries, drafts, classifications, duplicate suggestions, touch suggestions, relationship reasoning.

Required behavior: AI drafts/suggests/prepares; human approval required for sensitive execution; audit/suggestion records written where appropriate; graceful fallback when API unavailable.

## Handwritten note provider

Default candidate: Handwrytten. Backup: Simply Noted.

Purpose: prepare or submit handwritten relationship touches after approval.

Required behavior: provider abstraction, manual V1 path, API path later, no submission without human approval, cost/status record when integrated.

## Transactional email provider

Purpose: approval notifications and daily digests.

Recommended sender: `network@joinwestpeek.com`.

Required behavior: no sending from Sequoia/Scooter personal Gmail, authenticated notification links, no one-click approval from email, notification failure cannot execute approval.
