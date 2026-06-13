# Environment Variables

Do not commit real secret values.

## Core runtime

Required production runtime variables include:

- `APP_SESSION_SECRET`
- `ADMIN_EMAIL_ALLOWLIST`
- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`
- `GOOGLE_REDIRECT_URI`
- `GOOGLE_SHEET_ID`
- `GOOGLE_SERVICE_ACCOUNT_EMAIL`
- `GOOGLE_PRIVATE_KEY`
- `GOOGLE_PRIVATE_KEY_ID`
- `GOOGLE_CLOUD_PROJECT_ID`
- `TOKEN_ENCRYPTION_SECRET`
- `ANTHROPIC_API_KEY`
- `ANTHROPIC_MODEL`
- `AI_PROVIDER`
- `APP_BASE_URL`
- `PITCH_LAB_SHARED_SECRET`

Optional provider variables include:

- `GOOGLE_SPEECH_LOCATION`
- `ANTHROPIC_VISION_MODEL`
- `GMAIL_TRIGGER_PHRASE`
- `ACCEPTED_TRIGGER_ALIASES`
- `PITCH_LAB_ALLOWED_ORIGIN`

`ANTHROPIC_MODEL` and `ANTHROPIC_VISION_MODEL` must be synchronized to Cloudflare with the other production runtime values. Omitting `ANTHROPIC_MODEL` causes production to use the code fallback, which may become unavailable even when `.env.local` contains a valid model.

## Google private key formats

`GOOGLE_PRIVATE_KEY` supports:

- standard PEM
- escaped-newline PEM
- quoted PEM
- service-account JSON containing `private_key`

Malformed values return the controlled error code:

`GOOGLE_PRIVATE_KEY_INVALID_FORMAT`

## Tier 4 deployed proof

Tier 4 is postdeploy-only and requires explicit deployed runtime inputs:

- `POSTDEPLOY_BASE_URL`
- `PLAYWRIGHT_BASE_URL`
- `SMOKE_BASE_URL`
- `TIER4_ULTIMATE_LIVE_PROOF=1`
- `WEST_PEEK_E2E_RUN_ID`
- `TIER4_AUTHENTICATED_STORAGE_STATE` or `PLAYWRIGHT_STORAGE_STATE`

Provider-specific live lanes may additionally require:

- `LIVE_GMAIL_TRIGGER_E2E=1`
- `LIVE_GMAIL_TRIGGER_EVIDENCE_ID`
- operator-seeded Gmail messages containing the run ID
- `GOOGLE_SHEETS_LIVE_E2E=1`
- `TIER4_AI_OCR_VOICE_E2E=1`
- `TIER4_ALLOW_CONTROLLED_UNAVAILABLE=1` only when controlled provider-unavailable behavior is the intended proof mode
- `PITCH_LAB_SHARED_SECRET`

Authenticated storage-state files belong under `.auth/` and must never be committed.

## Fresh Google Sheets readback

The authenticated snapshot endpoint supports:

`/api/sheets/snapshot?fresh=1`

This bypasses the short-lived snapshot cache so Tier 4 can prove immediate Google Sheets write/readback behavior. Normal application reads may continue using the cache.

## Test-only provider controls

- `APP_ENV=test`
- `AUTH_PROVIDER=test`
- `DATA_PROVIDER=fixture`
- `GMAIL_PROVIDER=fixture`
- `SHEETS_PROVIDER=local-adapter`

These values are valid only in local/test runtime. Fixture or test-auth activation on a production/non-local hostname must hard-fail.
