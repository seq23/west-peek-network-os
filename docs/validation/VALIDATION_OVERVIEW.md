# Validation Overview — West Peek Network OS

This repo uses four proof layers. Static validation is not runtime proof. Local browser proof is not deployed proof. Deployed smoke is not live provider/data proof.


- `npm run validate:predeploy:full` — source/static/build/contract/docs hygiene and Tier 4-ready dry-run proof.
- `npm run validate:postdeploy:strict` — Tier 3 deployed smoke/safety check with explicit deployed URL.
- `npm run tier4:ultimate-live-proof` — Tier 4 postdeploy live provider + data proof.
- `npm run release:proof` — wrapper that runs predeploy, then postdeploy if a deployed URL is provided, then Tier 4 only when `TIER4_ULTIMATE_LIVE_PROOF=1` is set.


## Tier boundary

Tier 4 is postdeploy only. Predeploy validation proves the repo is Tier 4-ready and that Tier 4 blocks honestly without live evidence; it does not pass Tier 4.
