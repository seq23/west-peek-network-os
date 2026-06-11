<!-- ARCHIVED: superseded by active runbooks / ledgers. See docs/archive/ARCHIVE_INDEX.md and docs/DOCS_CONSOLIDATION_MAP.md. -->

# Hostile Review — AI Assistant + Instructions Overhaul

## Findings fixed

1. **Public AI spend risk**
   - Problem: `/api/ai/suggestions/create` could be called without session auth.
   - Fix: route now requires signed Google OAuth `wpn_session` allowlisted by `ADMIN_EMAIL_ALLOWLIST` before calling Anthropic.

2. **Browser-trusted requester risk**
   - Problem: browser body could submit `requested_by`.
   - Fix: requester is now derived from the authenticated session only.

3. **Prompt/cost runaway risk**
   - Problem: no route-level input size limit.
   - Fix: `raw_text` capped at 6,000 characters.

4. **Unclear E2E traceability**
   - Problem: successful AI route response did not explain the actual data path.
   - Fix: route now returns `trace_id` and `internal_data_trace` covering auth, parse, validation, Anthropic call, Sheets persistence, and execution guardrail.

5. **Human-review ambiguity**
   - Problem: status was generic `pending`.
   - Fix: persisted AI suggestions use `pending_human_review`; response keeps `execution_allowed: false` and `execution_status: not_executed`.

6. **Instructions page confusion**
   - Problem: fast/minimal examples were too similar, and add routes were not explained by use case.
   - Fix: instructions now separate Manual Add, reply-in-thread, forward-to-self, standalone note-to-self, and live visible trigger. Fast and minimal are explicitly differentiated.

7. **ZIP validation fragility**
   - Problem: secret scanner failed outside a Git checkout.
   - Fix: scanner now falls back to source-tree scanning when `.git` is unavailable.

8. **OAuth tab naming mismatch in docs**
   - Problem: some docs said `oauth_accounts` while runtime uses `oauth_tokens`.
   - Fix: docs now use `oauth_tokens` with runtime headers.

## Remaining unproven layer

Live Anthropic + Google Sheets behavior is structurally implemented but must be proven after deployment with one authenticated smoke test. That test may consume Anthropic API credit.
