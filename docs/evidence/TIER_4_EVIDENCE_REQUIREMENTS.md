# Tier 4 Evidence Requirements

Tier 4 requires real deployed provider/data evidence.

- `WEST_PEEK_E2E_RUN_ID` is mandatory.
- Gmail evidence is operator-seeded because the app uses Gmail read-only.
- Google Sheets writes must include the run id and be read back.
- Pitch Lab payloads must be signed and replay/stale failures must be proven.
- AI/OCR/voice providers must either work or return controlled unavailable state.

Required lanes:

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
