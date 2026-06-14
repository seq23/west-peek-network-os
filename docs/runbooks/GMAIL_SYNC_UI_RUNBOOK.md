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
