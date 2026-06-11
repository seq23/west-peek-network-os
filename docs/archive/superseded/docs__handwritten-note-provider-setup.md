<!-- ARCHIVED: superseded by active runbooks / ledgers. See docs/archive/ARCHIVE_INDEX.md and docs/DOCS_CONSOLIDATION_MAP.md. -->

# Handwritten Note Provider Setup

Default candidate: Handwrytten.

Backup/comparison candidate: Simply Noted.

V1 supports manual vendor workflow:

- default vendor name
- default vendor URL
- draft message
- copy/open vendor workflow
- mark sent
- audit log

V1.5/V2 may add API submission after human approval.

## 2026-06-07 Vendor Handoff Update

Network OS does not currently auto-order physical handwritten notes. Approval means the touch is ready for a human fulfillment choice.

Supported fulfillment scenarios:

1. Handwrytten vendor handoff — preferred starting point for future API/custom logo automation.
2. Simply Noted vendor handoff — alternate real-ink handwritten note service.
3. Postable vendor handoff — simple mailed-card fallback; treat as printed/card fulfillment rather than preferred real-ink handwritten flow.
4. I’ll do it myself — no third-party vendor; the operator writes, stamps, mails, or otherwise sends the note personally.

E2E data trace for handwritten note:

intake_queue Touch: Handwritten note → relationship_touches pending_approval → approvals pending → approval approved → relationship_touches approved_ready_to_send → operator chooses vendor or self → relationship_touches opened_vendor / will_do_myself → operator marks sent externally → relationship_touches sent_externally.

Guardrails:

- execution_allowed remains false.
- Network OS does not pay vendors.
- Network OS does not place orders.
- Network OS does not mail cards.
- Network OS preserves vendor/self choice in Google Sheets.
