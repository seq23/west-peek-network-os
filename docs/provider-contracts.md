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

Implemented route: `POST /api/ai/suggestions/create` calls Anthropic Messages API, writes a pending `ai_suggestions` row to Google Sheets, and returns `execution_allowed: false`. This route does not send communications, order gifts/cards, merge/delete contacts, or execute follow-up. It creates review material only.

## Handwritten note provider

Default candidate: Handwrytten. Backup: Simply Noted.

Purpose: prepare or submit handwritten relationship touches after approval.

Required behavior: provider abstraction, manual V1 path, API path later, no submission without human approval, cost/status record when integrated.

## Transactional email provider

Purpose: approval notifications and daily digests.

Recommended sender: `network@joinwestpeek.com`.

Required behavior: no sending from Sequoia/Scooter personal Gmail, authenticated notification links, no one-click approval from email, notification failure cannot execute approval.


## Google Speech-to-Text

Direct audio upload transcription uses Google Speech-to-Text v2 with service-account OAuth and `GOOGLE_CLOUD_PROJECT_ID`. Supported operator uploads include M4A, MP3, WAV, WEBM, MP4 audio, and AAC. Transcripts are structured by Claude and saved as pending Intake Queue drafts.

## Claude Vision OCR

Business cards and notes screenshots use Claude vision for extraction. Browser-side HEIC/HEIF normalization converts iPhone images to JPEG when supported by the browser before sending to Claude. Raw HEIC that reaches the server is blocked with a clear error rather than silently pretending OCR succeeded.

## WP Thank-You Card Studio

Claude drafts West Peek thank-you card copy and email-ready copy. The route saves a `relationship_touches` row with `pending_approval` and `execution_allowed: false`; it never auto-sends.
