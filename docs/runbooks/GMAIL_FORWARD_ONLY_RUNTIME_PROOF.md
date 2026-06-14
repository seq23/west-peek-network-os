# Combined Gmail Trigger and Forward-Only Runtime Proof

Status: REQUIRED AFTER GMAIL TRIGGER OR INGESTION LIFECYCLE CHANGES

## Purpose

This is the single canonical manual Gmail provider proof. It replaces the need to run one manual alias proof and then a second forward-only proof.

One eight-message packet proves:

- all five canonical Gmail trigger aliases;
- relationship versus deal-flow classification;
- human-review-only intake behavior;
- five-message Cloudflare Worker batching;
- real Gmail continuation and server cursor persistence;
- forward-only mailbox watermarking;
- permanent Gmail message-ID ledger dedupe;
- Tier 4 marker rejection;
- exact Intake cleanup;
- no re-import after cleanup;
- explicit backfill separation.

## Canonical seed method: manual

No Gmail send API token is required.

First ensure the selected mailbox already has a normal-sync watermark. In the deployed UI, click **Sync new emails from Gmail** once before generating the packet. If no new mail exists, this establishes the forward-only starting boundary without importing history.

Generate one packet:

```bash
npm run gmail:forward-only:generate-seeds -- sequoia@westpeek.ventures
```

The generator creates `seed-emails.md`, `seed-emails.json`, and `runtime.env` under:

```text
artifacts/manual-gmail-seeds/<RUN_ID>/
```

Send all eight messages exactly as written. They may be sent manually in Gmail or through an authenticated Gmail assistant connection.

## Packet composition

| Email | Trigger | Expected intent | Purpose |
|---|---|---|---|
| 1 | `#wpnetwork` | `network` | Canonical relationship trigger |
| 2 | `#addtowestpeek` | `network` | Relationship alias |
| 3 | `#westpeeknetwork` | `network` | Relationship alias |
| 4 | `#wpdealflow` | `deal_flow` | Canonical deal-flow trigger |
| 5 | `#dealflow` | `deal_flow` | Deal-flow alias |
| 6 | `#wpdealflow` | `deal_flow` | Pagination volume |
| 7 | `#wpdealflow` | `deal_flow` | Pagination volume |
| 8 | `#wpdealflow` plus Tier 4 marker | rejected | Production proof-fixture rejection |

The seven accepted messages exceed the five-message Worker batch limit. With the rejected eighth message, the provider path must use continuation and cursor state.

## Required inputs

- `PLAYWRIGHT_BASE_URL`;
- authenticated Playwright storage state;
- `LIVE_GMAIL_FORWARD_ONLY_E2E=1`;
- `FORWARD_ONLY_GMAIL_SEED_MODE=manual`;
- one approved `FORWARD_ONLY_GMAIL_MAILBOX`;
- exact generated `FORWARD_ONLY_GMAIL_RUN_ID`.

Load the generated environment file, then run the proof:

```bash
set -a
source artifacts/manual-gmail-seeds/<RUN_ID>/runtime.env
set +a
```

```bash
PLAYWRIGHT_BASE_URL="https://network.joinwestpeek.com" \
TIER4_AUTHENTICATED_STORAGE_STATE=".auth/playwright-storage-state.json" \
PLAYWRIGHT_STORAGE_STATE=".auth/playwright-storage-state.json" \
npm run release:gmail-forward-only-proof
```

## Single-proof lifecycle rule

A successful `release:gmail-forward-only-proof` also satisfies the Tier 4 Gmail trigger-ingestion lane. Do not run the older five-message alias proof separately during the same lifecycle.

The older `test:e2e:live-gmail:real` command remains available only for narrow historical diagnostics. It is not an additional release requirement after the combined proof passes.

## Cleanup boundary

The proof physically deletes only the seven accepted Intake rows for the exact generated run ID. It preserves permanent provider records:

- `gmail_ingestion_ledger`;
- `gmail_sync_watermark`;
- `gmail_sync_cursor`;
- `gmail_sync_lock`.

Seed emails remain in Gmail. Permanent ledger entries prevent their re-import.

## Completion rule

Gmail ingestion is runtime-proven only after this combined deployed command passes against the exact deployed artifact hash.
