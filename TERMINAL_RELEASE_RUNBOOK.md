# Terminal Release Runbook

## Apply ZIP

```bash
ALLOW_LARGE_DELETE=1 ~/update_repo_from_zip_generic_v3.sh "$HOME/Downloads/west-peek-network-os-main_BASELINE_06-12-26_<sha>.zip" "/Users/sequoiataylor/Documents/GitHub/west-peek-network-os" snapshot "west-peek-network-os"
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
