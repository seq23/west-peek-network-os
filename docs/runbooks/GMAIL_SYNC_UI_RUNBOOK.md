# Gmail Sync UI Runbook

Status: ACTIVE
Date: 2026-06-14

## Operator controls

The same **Sync new emails from Gmail** control appears in:

- Dashboard → System health
- Intake Queue
- Settings → Gmail intake sync

All placements use one shared component and one backend endpoint.

## Approved mailboxes

Only these Gmail identities may be selected for sync:

- `info@westpeek.ventures`
- `sequoia@westpeek.ventures`
- `scooter@westpeek.ventures`

Each mailbox must complete Google OAuth separately. A mailbox that is not connected is skipped and identified in the completion message. The endpoint rejects any mailbox outside this allowlist.

## Mailbox policy

- `sequoia@westpeek.ventures` and `scooter@westpeek.ventures`: import only messages containing a canonical trigger: `#wpnetwork`, `#addtowestpeek`, `#westpeeknetwork`, `#wpdealflow`, or `#dealflow`.
- `info@westpeek.ventures`: when connected as its own Google account, eligible inbound founder/deal-flow messages may be classified without a hashtag.

Every imported item is written to Intake Queue for human review. Sync never sends email, creates introductions, approves transactions, or bypasses duplicate protection.

## Difference from Google Sheets refresh

**Refresh from Google Sheets** reloads records that already exist in the workbook. It does not query Gmail and cannot create intake records.

**Sync new emails from Gmail** queries every approved mailbox that is actually connected, imports qualifying messages, and then refreshes the Google Sheets snapshot so new intake rows appear immediately.

## Completion message

The UI reports:

- connected mailboxes checked;
- mailboxes not connected;
- imported message count;
- duplicate count;
- per-message failure count;
- mailbox-level errors;
- Intake refresh failure, if sync succeeded but the follow-up snapshot refresh failed.

## Hostile behavior

- Repeated clicks cannot start a second browser-side batch.
- The server rejects unapproved mailbox identities.
- One malformed, disconnected, or failed mailbox does not prevent another connected mailbox from completing.
- A successful response naming a different mailbox than requested is rejected by the UI as an integrity mismatch.
- Non-JSON error responses are surfaced as HTTP failures rather than crashing the control.

## Cloudflare Worker subrequest safety

A mailbox sync is deliberately split into continuation-based batches of at most **five Gmail messages per Worker invocation**. The backend performs one Gmail search page per invocation and returns `has_more` plus `next_page_token` when more messages remain. The shared UI follows that continuation token sequentially, with a hard ceiling of 20 batches per mailbox per click.

This design prevents one Worker invocation from accumulating Gmail message fetches and Google Sheets write/readback calls until Cloudflare rejects the request for excessive subrequests. The UI never retries a completed batch blindly; it continues only with the provider-issued page token.

A mailbox with an active OAuth token that fails during sync is reported as **connected but failed**. It must never be described as disconnected merely because Gmail, Sheets, or the Worker runtime returned an error.


## Failure classification and continuation safety

Only an explicit `MAILBOX_NOT_CONNECTED` response is shown as disconnected. Network, provider, malformed, and Cloudflare Worker-limit responses are shown as mailbox sync failures. The client rejects repeated Gmail continuation tokens and stops that mailbox to prevent an infinite or duplicate loop.

## Forward-only ingestion boundary

Normal UI sync is forward-only. Each approved mailbox has two permanent record families in `provider_replay_guard`:

- `gmail_sync_watermark`: the last successful normal-sync boundary for that mailbox.
- `gmail_ingestion_ledger`: one permanent key per Gmail message ID and mailbox, including imported, duplicate, irrelevant, and rejected proof-fixture outcomes.
- `gmail_sync_cursor`: the server-owned continuation token and sync-start boundary for an interrupted or safety-capped mailbox run. The normal UI never supplies its own cursor or watermark.

The first successful OAuth connection establishes a `start now` watermark. Normal UI sync never searches older history. A reconnect does not reset an existing watermark. The watermark advances only after the final continuation page completes without message-fetch failures.

Historical backfill is separate and confirmation-gated. It requires `sync_mode=backfill` and `backfill_confirm=BACKFILL_GMAIL_HISTORY`; it is never invoked by the normal UI button.

Production sync rejects known Tier 4 proof markers (`wpno-tier4`, `WEST_PEEK_E2E_RUN_ID`, `WP Network Tier 4`, or `Tier 4 Proof`) and records the Gmail message ID permanently so the message cannot reappear after Sheet cleanup.

Historical Tier 4 cleanup must preserve both permanent Gmail record families. To remove re-imported Tier 4 intake rows, use the existing historical marker preview and confirmed deletion flow; do not delete the Gmail ledger or watermark rows.


### Hostile continuation guarantees

Normal sync uses a 120-second overlap on the saved watermark and relies on the permanent message ledger for deduplication. This prevents same-second delivery/indexing races from losing mail. If a click reaches the 20-batch UI ceiling, the server-owned `gmail_sync_cursor` remains active, and the next click resumes from that cursor instead of replaying the first 100 messages. Client-supplied `page_token` and `sync_started_at` values are ignored in normal mode.


## Concurrency boundary

The server uses a short-lived per-mailbox `gmail_sync_lock` record in `provider_replay_guard` in addition to the client repeat-click guard. Concurrent clients cannot process the same mailbox batch at the same time. Lock rows expire safely and are preserved by proof-fixture cleanup.
