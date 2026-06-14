# Hostile Gmail Sync UI Review — 2026-06-14

## Scope

Reviewed the shared Gmail sync control, `/api/gmail/sync`, Dashboard, Intake Queue, Settings, automatic Sheets refresh, and narrow post-cleanup integrity behavior.

## Findings repaired

1. **Endpoint mailbox selection was not server allowlisted.** An authenticated caller could request any mailbox represented by an active token row. The endpoint now rejects any mailbox outside the three approved identities with `MAILBOX_NOT_APPROVED`.
2. **Double-click race.** React state alone could allow two handlers before the disabled state rendered. A synchronous `useRef` lock now prevents a second batch.
3. **One fetch exception aborted the whole batch without a useful result.** Each mailbox is now isolated; failures are reported and remaining approved mailboxes continue.
4. **Malformed/non-JSON errors were weakly diagnosed.** They now surface as deterministic HTTP failures.
5. **Server mailbox mismatch was trusted.** The UI now rejects a response that names a mailbox different from the requested mailbox.
6. **Snapshot refresh failure could leave the result stuck or unreported.** Sync totals remain visible and the refresh failure is appended explicitly.

## Proof added

The existing browser suite now proves:

- Settings distinguishes Sheets refresh from Gmail import;
- exactly the three approved mailbox requests are issued sequentially;
- connected/not-connected identities and aggregate counts are shown;
- Dashboard and Intake Queue expose the same shared control;
- malformed and failed mailbox responses do not block a connected mailbox;
- rapid repeat activation launches only one three-mailbox batch.

Static contracts now guard the shared component, three-screen placement, approved mailbox set, server allowlist, automatic refresh, and narrow post-cleanup integrity behavior.

## Unproven boundary

Local mocked browser tests do not prove the three real Gmail OAuth tokens are currently connected or that Gmail/Sheets providers are available. Those remain deployed runtime facts.

## Addendum — live Worker subrequest failure

A deployed operator run exposed a provider-layer defect not covered by mocked UI tests: a single mailbox sync could exceed Cloudflare Worker subrequest limits. Remediation now enforces five-message continuation batches, a single Gmail search query per batch, no per-message full-Sheet duplicate reread, bounded UI continuation, and explicit connected-mailbox failure reporting. The hostile browser suite includes continuation-token sequencing and the exact connected-provider-failure classification.


## Follow-up hostile review — Worker-generated failures and pagination loops

- Upstream Cloudflare failures may return non-JSON responses without `mailbox_connected`; the UI treats every failure except explicit `MAILBOX_NOT_CONNECTED` as a mailbox sync failure and never mislabels it as disconnected.
- Gmail continuation tokens are tracked per mailbox. A repeated token stops the run immediately to prevent duplicate pagination loops.
- Registered browser cases cover raw Worker-limit responses and repeated continuation tokens.

## Forward-only lifecycle hostile review

Added guards for: old Gmail proof-message resurrection after Sheet cleanup, first-connect historical flood, watermark reset on reconnect, continuation runs changing their own time boundary, failed final batches advancing the watermark, normal UI query overrides, unconfirmed backfills, Tier 4 proof-marker imports in production, and historical cleanup deleting permanent Gmail ingestion evidence.

## Forward-only ingestion hostile re-review

The first forward-only artifact was rejected after hostile review found two lifecycle gaps:

1. A mailbox with more than 100 eligible messages could never progress beyond the first 20 five-message batches. Re-clicking restarted page one because the continuation token lived only in browser memory.
2. Advancing a watermark at exact second precision could omit messages indexed or delivered in the same second as the saved boundary.

Corrections:

- Normal mode now owns continuation state server-side in permanent `gmail_sync_cursor` rows. A safety-capped or interrupted run resumes on the next click.
- Normal mode ignores browser-supplied `page_token` and `sync_started_at` values.
- Watermark queries overlap the prior boundary by 120 seconds; the permanent per-message ledger absorbs duplicates.
- Tier 4 cleanup preserves ledger, watermark, and cursor rows.

Proof boundary: registered static, type, build, and predeploy gates passed. The seven Gmail Sync UI Playwright cases were collected but could not execute in the artifact container because the Playwright Chromium binary is unavailable. Local updater real-browser validation remains required.


## Forward-only hostile loop additions

- **Failed-message page replay:** a Gmail message-fetch failure no longer advances the server cursor past the failed page. The current page is persisted with a first-page sentinel when necessary and retried through a server-managed continuation token.
- **Cross-client concurrency:** a persistent two-minute per-mailbox lock complements the React double-click guard so two browsers cannot race the same Gmail page into duplicate Intake rows.
- **Runtime proof:** the admitted deployed proof seeds eight real Gmail messages, forces continuation, verifies Tier 4 rejection, deletes only runtime-proof Intake rows, confirms permanent ledger survival, and proves a second sync cannot recreate deleted Intake rows.
## Final whole-repo hostile pass — lock-race containment

A final artifact-root review found that a losing cross-client Gmail sync lock race returned before storing its own lock ID. The losing invocation therefore could not append a release event in `finally`, leaving a phantom active lock for the two-minute TTL after the winning invocation completed. The endpoint now records its lock ID before checking race ownership, so every contender releases its own lock event deterministically. The registered provider-error validator fails if this ordering regresses.

The same pass also reconciled all active runbooks with the documentation consolidation map.

