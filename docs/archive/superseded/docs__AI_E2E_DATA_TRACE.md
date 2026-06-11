<!-- ARCHIVED: superseded by active runbooks / ledgers. See docs/archive/ARCHIVE_INDEX.md and docs/DOCS_CONSOLIDATION_MAP.md. -->

# AI E2E Internal Data Trace — West Peek Network OS

Purpose: prove the Claude relationship assistant path is a human-review-only data flow, not an execution path.

## Live route

`POST /api/ai/suggestions/create`

## Trace stages returned by the route

The route returns `trace_id` and `internal_data_trace` with these stages when successful:

1. `auth` — signed `wpn_session` cookie is verified against `ADMIN_EMAIL_ALLOWLIST`.
2. `request_parse` — JSON body is parsed.
3. `input_validation` — `raw_text` is present, capped at 6,000 characters, and source/suggestion types are normalized.
4. `anthropic_call` — Claude returns a normalized relationship suggestion.
5. `persistence` — a `pending_human_review` row is appended to the `ai_suggestions` Google Sheets tab.
6. `execution_guardrail` — the route confirms that no email, gift, merge, delete, ownership change, or approval was executed.

## Request body

```json
{
  "raw_text": "#wpnetwork\nName: Jordan Miles\nCompany: Apex Family Office\nContext: Met at dinner. Wants to review late-stage venture deal flow. Needs a thoughtful email follow-up this week.",
  "source_entity_type": "intake_queue",
  "source_entity_id": "browser_smoke_test",
  "suggestion_type": "follow_up_recommendation"
}
```

`requested_by` is not accepted from the browser as source of truth. It is derived from the authenticated Google OAuth session.

## Expected successful response shape

```json
{
  "ok": true,
  "provider": "anthropic",
  "trace_id": "ai_trace_...",
  "internal_data_trace": [
    { "stage": "auth", "status": "passed", "detail": "authenticated allowlisted operator ..." },
    { "stage": "request_parse", "status": "passed", "detail": "JSON body parsed" },
    { "stage": "input_validation", "status": "passed", "detail": "... chars accepted ..." },
    { "stage": "anthropic_call", "status": "passed", "detail": "Claude returned normalized ... suggestion" },
    { "stage": "persistence", "status": "passed", "detail": "pending_human_review row appended to ai_suggestions" },
    { "stage": "execution_guardrail", "status": "passed", "detail": "no email, gift, merge, delete, ownership change, or approval executed" }
  ],
  "human_review_required": true,
  "execution_allowed": false,
  "execution_status": "not_executed",
  "persistence": "google_sheets"
}
```

## Hostile checks added

- Anonymous users are blocked before Anthropic is called.
- Browser-supplied `requested_by` is ignored.
- `raw_text` is capped to reduce accidental token spend.
- Source entity type and suggestion type are allowlisted/normalized.
- Returned trace does not include raw prompt text, API keys, Google private keys, OAuth tokens, or encrypted token payloads.
- The persisted row status is `pending_human_review`, not approved/executed.
- The response always returns `execution_allowed: false` and `execution_status: not_executed`.

## What this still does not prove inside the ZIP

A ZIP-only structural test cannot prove Anthropic billing, deployed Cloudflare secrets, or the live Google Sheet append. That final proof requires one deployed smoke test from an authenticated browser session with valid Anthropic API credits and Google Sheets access.
