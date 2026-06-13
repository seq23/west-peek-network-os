# Testing Sequence

1. `npm run validate:predeploy:full`
2. deploy
3. `npm run validate:postdeploy:strict` with explicit deployed URLs
4. `npm run tier4:ultimate-live-proof` with live provider/data evidence


- `npm run validate:predeploy:full` — source/static/build/contract/docs hygiene and Tier 4-ready dry-run proof.
- `npm run validate:postdeploy:strict` — Tier 3 deployed smoke/safety check with explicit deployed URL.
- `npm run tier4:ultimate-live-proof` — Tier 4 postdeploy live provider + data proof.
- `npm run release:proof` — wrapper that runs predeploy, then postdeploy if a deployed URL is provided, then Tier 4 only when `TIER4_ULTIMATE_LIVE_PROOF=1` is set.


Tier 4 is postdeploy only. Do not claim live OAuth/Gmail/Sheets proof until Tier 4 passes.


Legacy aggregate command for Tier 3: `npm run test:everything -- --tier=3` or `node scripts/run-test-everything-aggregate.mjs --tier=3`.

## Simplified validation sequence

Use the bundled commands instead of one-off terminal validation:

1. `npm run validate:predeploy:full`
2. `POSTDEPLOY_BASE_URL=<url> PLAYWRIGHT_BASE_URL=<url> SMOKE_BASE_URL=<url> npm run validate:postdeploy:strict`
3. `POSTDEPLOY_BASE_URL=<url> PLAYWRIGHT_BASE_URL=<url> SMOKE_BASE_URL=<url> TIER4_ULTIMATE_LIVE_PROOF=1 WEST_PEEK_E2E_RUN_ID="wpno-tier4-$(date +%Y%m%d%H%M%S)" npm run tier4:ultimate-live-proof`

Do not use archived exact-token validators as release gates. If a validator blocks, it must map to real product/security/persistence/deploy/proof risk.
