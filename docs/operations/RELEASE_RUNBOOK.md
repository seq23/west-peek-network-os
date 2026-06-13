# Release Runbook

1. Run `npm run validate:predeploy:full`.
2. Deploy through the repo's Cloudflare/GitHub path.
3. Run `npm run validate:postdeploy:strict` with explicit deployed URLs.
4. Run `npm run tier4:ultimate-live-proof` only when live OAuth/Gmail/Sheets evidence is ready.


- `npm run validate:predeploy:full` — source/static/build/contract/docs hygiene and Tier 4-ready dry-run proof.
- `npm run validate:postdeploy:strict` — Tier 3 deployed smoke/safety check with explicit deployed URL.
- `npm run tier4:ultimate-live-proof` — Tier 4 postdeploy live provider + data proof.
- `npm run release:proof` — wrapper that runs predeploy, then postdeploy if a deployed URL is provided, then Tier 4 only when `TIER4_ULTIMATE_LIVE_PROOF=1` is set.
