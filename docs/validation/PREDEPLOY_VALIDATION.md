# Predeploy Validation

Command:

```bash
npm run validate:predeploy:full
```

This command cleans generated artifacts, checks artifact manifest currency, runs TypeScript/source validators, validates Google private-key parsing, validates OAuth/provider/Tier 4 contracts, checks documentation and matrix consistency, and runs `tier4:dry-run-blocked`.

Expected Tier 4 readiness result during predeploy: `BLOCKED — TIER 4 ULTIMATE LIVE E2E PROOF REQUIRED`.

Predeploy proves the repo is Tier 4-ready. It does not prove live OAuth, Gmail ingestion, or Sheets persistence.
