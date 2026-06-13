# West Peek Network OS

Private relationship intelligence, Gmail-trigger intake, Google Sheets persistence, public event intake, Pitch Lab handoff, and review-only AI/OCR/voice assistance.

## Validation command map


- `npm run validate:predeploy:full` — source/static/build/contract/docs hygiene and Tier 4-ready dry-run proof.
- `npm run validate:postdeploy:strict` — Tier 3 deployed smoke/safety check with explicit deployed URL.
- `npm run tier4:ultimate-live-proof` — Tier 4 postdeploy live provider + data proof.
- `npm run release:proof` — wrapper that runs predeploy, then postdeploy if a deployed URL is provided, then Tier 4 only when `TIER4_ULTIMATE_LIVE_PROOF=1` is set.


Tier 4 is postdeploy only. Predeploy proves the repo is Tier 4-ready; it does not prove live Gmail/OAuth/Sheets success.

See `docs/validation/VALIDATION_COMMANDS.md` and `docs/operations/TIER_4_OPERATOR_RUNBOOK.md`.

## Validation simplification

Use bundled gates, not one-off validator whack-a-mole:

- Predeploy: `npm run validate:predeploy:full`
- Postdeploy: `POSTDEPLOY_BASE_URL=<url> PLAYWRIGHT_BASE_URL=<url> SMOKE_BASE_URL=<url> npm run validate:postdeploy:strict`
- Tier 4: `POSTDEPLOY_BASE_URL=<url> PLAYWRIGHT_BASE_URL=<url> SMOKE_BASE_URL=<url> TIER4_ULTIMATE_LIVE_PROOF=1 WEST_PEEK_E2E_RUN_ID="wpno-tier4-$(date +%Y%m%d%H%M%S)" npm run tier4:ultimate-live-proof`

Legacy exact-token hostile-audit validation is archived and does not block release.
