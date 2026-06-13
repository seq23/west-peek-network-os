# Tier Validation Model

## Tier 1 — Static / Contract Validation
Proves source contracts, env scaffolds, validator admission, no secrets, docs/matrix consistency, and artifact hygiene.

## Tier 2 — Local Browser / Local App Validation
Proves local app/browser behavior where browser execution is available.

## Tier 3 — Postdeploy Runtime Smoke / Deployed Safety
Proves deployed URL, route safety, postdeploy smoke, provider status safety, and no raw crash pages.

## Tier 4 — Ultimate Live E2E Provider + Data Proof
Tier 4 is postdeploy only. It proves real Google OAuth, Gmail ingestion, Google Sheets persistence, Pitch Lab signed handoff, public event intake, AI/OCR/voice controlled behavior, and auth/session boundaries.

Predeploy validation proves Tier 4-ready and that Tier 4 blocks honestly without live evidence; it does not pass Tier 4.

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

Provider lane anchors: /api/gmail/sync; Gmail trigger sync; operator-seeded Gmail; Google Sheets read/write; Claude Vision OCR; Google Speech-to-Text; execution_allowed=false; human_review_required; Header spoofing is not accepted; Tier 4 is postdeploy only; Ultimate Live E2E provider + data proof.
