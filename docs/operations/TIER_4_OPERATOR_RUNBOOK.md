# Tier 4 Operator Runbook

Tier 4 is postdeploy only. It requires live provider/data evidence and must not fake success.

## Command

```bash
POSTDEPLOY_BASE_URL=https://your-deployed-url \
PLAYWRIGHT_BASE_URL=https://your-deployed-url \
SMOKE_BASE_URL=https://your-deployed-url \
TIER4_ULTIMATE_LIVE_PROOF=1 \
WEST_PEEK_E2E_RUN_ID="wpno-tier4-$(date +%Y%m%d%H%M%S)" \
npm run tier4:ultimate-live-proof
```

## Lanes

- `tier4-prereq-postdeploy-strict`
- `tier4-oauth-connect-live`
- `tier4-gmail-trigger-ingestion-live`
- `tier4-google-sheets-readwrite-live`
- `tier4-human-review-workflow-live`
- `tier4-contact-workflow-live`
- `tier4-relationship-touch-live`
- `tier4-public-event-live`
- `tier4-pitchlab-signed-handoff-live`
- `tier4-ai-ocr-voice-live`
- `tier4-auth-boundary-live`
- `tier4-runtime-context-live`
- `tier4-report-check`

## Google Sheets quota pacing

The orchestrator enforces a minimum 65-second gap between Sheets-heavy live lanes because the deployed Google project is subject to per-user read quotas measured per minute. Override only with `TIER4_SHEETS_COOLDOWN_MS`, which must remain at least `60000`. Disabling or shortening the cooldown below one minute is forbidden. A quota failure remains a real failed lane; the orchestrator does not silently retry a possibly partially written mutation.

## Required evidence

- explicit deployed URL
- OAuth storage state or interactive Google OAuth path
- operator-seeded Gmail messages with `WEST_PEEK_E2E_RUN_ID`
- Google Sheets row markers/readback
- Pitch Lab signed payloads
- provider configured or controlled unavailable state

`BLOCKED` means evidence or live environment is missing. `TIER 4 PASSED` means every hard live lane passed.
