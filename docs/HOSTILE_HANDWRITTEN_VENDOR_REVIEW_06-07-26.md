# Hostile Handwritten Vendor Review — 2026-06-07

## Gap found

A handwritten-note approval previously ended at a safe but incomplete state: pending/approved rows existed, but there was no explicit vendor or self-fulfillment path.

## Fix

Added a manual fulfillment layer instead of pretending the app can send cards automatically.

## Supported scenarios

1. Vendor handoff: operator copies note details and opens Handwrytten, Simply Noted, or Postable.
2. Self fulfillment: operator chooses “I’ll do it myself.”
3. Mark sent externally: operator records completion after mailing/sending outside Network OS.
4. Vendor setup later: Handwrytten remains the preferred API/custom-logo candidate once payment/account/API setup is intentionally configured.

## Data trace

`Touch: Handwritten note` → `relationship_touches.pending_approval` → `approvals.pending` → `approvals.approved` → `relationship_touches.approved_ready_to_send` → `relationship_touches.opened_vendor` or `relationship_touches.will_do_myself` → `relationship_touches.sent_externally`.

## Guardrails

- No automatic payment.
- No automatic third-party API order.
- No automatic email/card send.
- `execution_allowed` remains `false`.
- All status updates append to Google Sheets and are collapsed by latest row on refresh.

## Remaining live validation

Requires deployed Google session and Google Sheets write/read smoke test.
