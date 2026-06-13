# Environment Variables

Important runtime variables include Google OAuth, Gmail, Google Sheets, Pitch Lab, and AI/OCR/voice provider keys. Do not commit real values.

`GOOGLE_PRIVATE_KEY` supports standard PEM, escaped-newline PEM, quoted PEM, or service-account JSON with `private_key`. Malformed values return `GOOGLE_PRIVATE_KEY_INVALID_FORMAT`.

Tier 4 requires explicit deployed URL variables:

- `POSTDEPLOY_BASE_URL`
- `PLAYWRIGHT_BASE_URL`
- `SMOKE_BASE_URL`
- `TIER4_ULTIMATE_LIVE_PROOF=1`
- `WEST_PEEK_E2E_RUN_ID`
