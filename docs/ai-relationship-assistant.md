# AI Relationship Assistant

Name: West Peek Relationship Assistant

AI may draft, suggest, classify, clean, summarize, enrich, dedupe, and recommend next actions.

AI may not send communications, order gifts/cards, delete records, merge records, or change admin/security settings without explicit human approval.

Provider: Claude/Anthropic API.

Twin is not the core system. It may be considered later as a sidecar for non-sensitive automation experiments.


## Runtime route

`POST /api/ai/suggestions/create` creates one Claude-powered relationship suggestion from `raw_text`. The route requires a valid signed West Peek Google OAuth session before it will call Anthropic, which prevents public anonymous cost/spam against the Claude API key.

Required JSON fields:

```json
{
  "raw_text": "#wpnetwork\nName: Jordan Miles\nContext: Met at dinner. Follow up this week.",
  "source_entity_type": "intake_queue",
  "source_entity_id": "intake_example",
  "suggestion_type": "follow_up_recommendation"
}
```

`requested_by` is derived from the authenticated session, not trusted from the request body.

Runtime guarantees:

- Requires a signed allowlisted `wpn_session` cookie before calling Anthropic.
- Caps `raw_text` at 6,000 characters to limit accidental/costly prompts.
- Calls Anthropic Messages API through `ANTHROPIC_API_KEY`.
- Writes a `pending_human_review` `ai_suggestions` row to Google Sheets.
- Returns an `internal_data_trace` with auth, validation, provider, persistence, and execution-guardrail stages. The trace must not include secret values.
- Returns `human_review_required: true`.
- Returns `execution_allowed: false`.
- Does not send emails, submit handwritten notes, order gifts, merge contacts, delete records, or change ownership.

Expected Google Sheets tab: `ai_suggestions`.

Headers:

```csv
suggestion_id,created_at,updated_at,suggestion_type,source_entity_type,source_entity_id,confidence,status,suggested_payload,reasoning_summary,reviewed_by,reviewed_at,applied_entity_type,applied_entity_id,created_by_agent
```
