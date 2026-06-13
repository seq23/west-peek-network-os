# Real Provider Lane Matrix

| Provider lane | Provider | Runtime/surface | Tier | Proof requirement |
|---|---|---|---|---|
| Gmail OAuth | Google OAuth | deployed auth callback/session | Tier 4 | real OAuth or authenticated storage state |
| Gmail trigger sync | Gmail API | deployed Gmail read | Tier 4 | operator-seeded Gmail + duplicate skip |
| Google Sheets read/write | Google Sheets API | deployed persistence | Tier 4 | write/readback with WEST_PEEK_E2E_RUN_ID |
| Pitch Lab signed handoff | HMAC signature | deployed functions | Tier 4 | valid/replay/stale/bad signature outcomes |
| Claude Vision OCR | Anthropic/provider route | deployed provider or controlled unavailable | Tier 4 | review-only suggestion or controlled unavailable |
| Google Speech-to-Text | Google Speech | deployed provider or controlled unavailable | Tier 4 | review-only transcript/intake or controlled unavailable |

# Real Provider Lane Matrix

Tier 4 is postdeploy only and has these required lanes:

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

Provider proof must be behavior-based. Gmail, Sheets, Pitch Lab, AI/OCR/voice, and OAuth cannot be claimed from static validators.

Provider lane anchors: /api/gmail/sync; Gmail trigger sync; operator-seeded Gmail; Google Sheets read/write; Claude Vision OCR; Google Speech-to-Text; execution_allowed=false; human_review_required; Header spoofing is not accepted; Tier 4 is postdeploy only; Ultimate Live E2E provider + data proof.
