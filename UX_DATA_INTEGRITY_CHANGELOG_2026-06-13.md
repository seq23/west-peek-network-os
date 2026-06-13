# UX and Data Integrity Changelog — 2026-06-13

## Product changes

- Fresh Google Sheets readback after mutations and manual refresh.
- Actionable/history views and local mutation states across core operator workflows.
- Contact archive/restore and event-form revoke/restore.
- Structured Sheet-maintenance diagnostics and operator explainers.
- Clean Gmail summaries with raw source collapsed.
- Intelligent shared-inbox monitoring for `info@westpeek.ventures`.

## Hostile-review corrections

- Shared inbox no longer imports every inbox message as deal flow.
- Sender parsing excludes both the signed-in operator and monitored mailbox.
- Multipart email extraction prefers plain text and avoids rendering duplicate HTML/plain bodies.
- Gmail intake IDs are deterministic by mailbox and Gmail message ID.
- Sheets is re-read immediately before append to reduce cross-request duplicate races.
- Failed Gmail message fetches and irrelevant skips are reported instead of disappearing silently.
- Sheet-maintenance headers now include all Gmail idempotency and classification fields.

## Proof boundary

Typecheck, build, static validators, and local contract tests can prove source integrity. They do not prove Gmail delivery, Google Sheets concurrency, headed UX, deployed Cloudflare behavior, or provider availability.
