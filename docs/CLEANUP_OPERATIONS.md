# Cleanup Operations Map

This document is the operator index for every cleanup mechanism in West Peek Network OS.

## Production data cleanup

### Exact Tier 4 run

Use after each live Tier 4 run:

```bash
npm run tier4:cleanup:preview -- <exact-run-id>
npm run tier4:cleanup -- <exact-run-id>
```

### Historical Tier 4 residue

Use only when legacy test records from multiple runs remain:

```bash
npm run tier4:cleanup:historical:preview
npm run tier4:cleanup:historical
```

Historical cleanup is terminal-only and uses strong Tier 4 markers. It is not a generic delete-all-test-looking-data operation.

### Ordinary operator records

Use the app's record-specific lifecycle controls. Contacts archive/restore, intake dismiss/review, events revoke/restore, and other supported record controls are business operations, not proof-fixture cleanup.

## Local-only cleanup

`fixtures:cleanup:expired` updates the repo-local proof ledger. It cannot clean Google Sheets provider rows.

The snapshot updater may delete `.auth/`, reports, build outputs, and other generated local files. That is filesystem hygiene, not production data cleanup. Restore auth state from the encrypted external vault when authenticated proof is needed.

## Non-negotiable rules

- preview before broad historical cleanup
- preserve real records
- never use fuzzy words such as `founder`, `event`, `Pitch Lab`, or `Gmail` alone as deletion selectors
- require fresh readback and zero remaining before success
- do not physically delete Sheet history
- do not claim UI cleanup until the deployed app refreshes from the cleaned snapshot

See `TIER4_PROOF_FIXTURE_CLEANUP.md` for the full contract.

## Network OS Tier 4 cleanup entry points

- Most recent run: `npm run tier4:cleanup:latest:preview`, then `npm run tier4:cleanup:latest`.
- Known exact run: `npm run tier4:cleanup:preview -- <run-id>`, then `npm run tier4:cleanup -- <run-id>`.
- Historical recovery: `npm run tier4:cleanup:historical:preview`, then `npm run tier4:cleanup:historical`.
- Full safety contract: [`../TIER4_PROOF_FIXTURE_CLEANUP.md`](../TIER4_PROOF_FIXTURE_CLEANUP.md).
