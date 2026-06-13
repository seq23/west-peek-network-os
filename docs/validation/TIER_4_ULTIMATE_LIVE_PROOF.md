# Tier 4 Ultimate Live E2E Provider + Data Proof

Tier 4 is postdeploy only. It must run against an explicit deployed URL with real provider/data evidence.

Command:

```bash
POSTDEPLOY_BASE_URL=https://your-deployed-url \
PLAYWRIGHT_BASE_URL=https://your-deployed-url \
SMOKE_BASE_URL=https://your-deployed-url \
TIER4_ULTIMATE_LIVE_PROOF=1 \
WEST_PEEK_E2E_RUN_ID="wpno-tier4-$(date +%Y%m%d%H%M%S)" \
npm run tier4:ultimate-live-proof
```

## Required lanes

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

## Result language

Passing report: `TIER 4 PASSED — ULTIMATE LIVE E2E PROVIDER + DATA PROOF`.

Blocked report: `BLOCKED — TIER 4 ULTIMATE LIVE E2E PROOF REQUIRED`.

Tier 4 must not fake Gmail OAuth, Gmail ingestion, Google Sheets persistence, Pitch Lab signed handoff, or AI/OCR/voice provider success. Missing live state produces BLOCKED / UNPROVEN.
