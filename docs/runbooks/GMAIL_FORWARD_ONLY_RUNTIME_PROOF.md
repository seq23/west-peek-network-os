# Gmail Forward-Only Runtime Proof

Status: REQUIRED AFTER GMAIL INGESTION LIFECYCLE CHANGES

## Purpose

This proof exercises the real normal-mode path across deployed Gmail, Cloudflare Workers, the permanent Gmail ledger/watermark/cursor records in Google Sheets, Intake Queue persistence, exact cleanup, and a second sync after cleanup.

It exists because Tier 4 Gmail proof mode intentionally uses a test query and does not prove the production forward-only boundary.

## Required inputs

- Deployed base URL through `PLAYWRIGHT_BASE_URL`.
- Authenticated Playwright storage state.
- `LIVE_GMAIL_FORWARD_ONLY_E2E=1`.
- `FORWARD_ONLY_GMAIL_MAILBOX`, equal to one approved and connected mailbox:
  - `info@westpeek.ventures`
  - `sequoia@westpeek.ventures`
  - `scooter@westpeek.ventures`
- `FORWARD_ONLY_GMAIL_SEED_ACCESS_TOKEN` with temporary `gmail.send` and `gmail.readonly` scopes. The proof verifies that the token belongs to the selected mailbox before seeding.
- Optional `FORWARD_ONLY_GMAIL_RUN_ID`; when omitted, the test creates `wpno-runtime-gmail-*`.

The send token is test-only. Production OAuth remains Gmail read-only.

## Command

```bash
PLAYWRIGHT_BASE_URL="https://network.joinwestpeek.com" \
TIER4_AUTHENTICATED_STORAGE_STATE=".auth/playwright-storage-state.json" \
PLAYWRIGHT_STORAGE_STATE=".auth/playwright-storage-state.json" \
FORWARD_ONLY_GMAIL_MAILBOX="sequoia@westpeek.ventures" \
FORWARD_ONLY_GMAIL_SEED_ACCESS_TOKEN="$FORWARD_ONLY_GMAIL_SEED_ACCESS_TOKEN" \
npm run release:gmail-forward-only-proof
```

## Exact behavior proved

1. A missing mailbox watermark is initialized before test mail is sent.
2. Seven normal trigger messages and one Tier 4-marked trigger message are created in real Gmail.
3. Normal sync processes no more than five Gmail messages per Worker invocation.
4. More than five matching messages force a real continuation page and server-side cursor records.
5. Seven normal messages create pending-review Intake rows.
6. The Tier 4-marked message creates no Intake row and is permanently ledgered as rejected.
7. The final successful page creates a completed cursor and advances the watermark.
8. Exact cleanup physically deletes only the seven runtime-proof Intake rows.
9. Gmail ledger rows survive cleanup.
10. A second normal sync does not recreate the deleted Intake rows.
11. Backfill without the exact confirmation phrase is rejected.
12. Browser-supplied normal-mode query and page-token overrides do not control the server path.

## Cleanup boundary

Runtime proof Intake rows use a `wpno-runtime-gmail-*` proof run ID so exact fixture cleanup can physically remove them. Permanent provider records are never proof fixtures and are not deleted:

- `gmail_ingestion_ledger`
- `gmail_sync_watermark`
- `gmail_sync_cursor`
- `gmail_sync_lock`

Seed emails remain in Gmail. Their permanent ledger entries prevent re-import.

## Completion rule

Gmail forward-only ingestion may not be called runtime-proven after lifecycle changes until this command passes against the deployed artifact hash.
