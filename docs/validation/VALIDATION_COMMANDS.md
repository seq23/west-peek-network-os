# Validation Commands


- `npm run validate:predeploy:full` — source/static/build/contract/docs hygiene and Tier 4-ready dry-run proof.
- `npm run validate:postdeploy:strict` — Tier 3 deployed smoke/safety check with explicit deployed URL.
- `npm run tier4:ultimate-live-proof` — Tier 4 postdeploy live provider + data proof.
- `npm run release:proof` — wrapper that runs predeploy, then postdeploy if a deployed URL is provided, then Tier 4 only when `TIER4_ULTIMATE_LIVE_PROOF=1` is set.


## Predeploy

```bash
npm run validate:predeploy:full
```

## Postdeploy strict

```bash
POSTDEPLOY_BASE_URL=https://your-deployed-url \
PLAYWRIGHT_BASE_URL=https://your-deployed-url \
SMOKE_BASE_URL=https://your-deployed-url \
npm run validate:postdeploy:strict
```

## Tier 4

```bash
POSTDEPLOY_BASE_URL=https://your-deployed-url \
PLAYWRIGHT_BASE_URL=https://your-deployed-url \
SMOKE_BASE_URL=https://your-deployed-url \
TIER4_ULTIMATE_LIVE_PROOF=1 \
WEST_PEEK_E2E_RUN_ID="wpno-tier4-$(date +%Y%m%d%H%M%S)" \
npm run tier4:ultimate-live-proof
```

## Release wrapper

```bash
npm run release:proof
```

`release:proof` never pretends to pass postdeploy or Tier 4 unless the required environment variables are supplied.
