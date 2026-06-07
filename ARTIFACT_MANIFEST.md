# Artifact Manifest — West Peek Network OS

Generated: 2026-06-07
Artifact: AI / OCR / Audio / Thank-You Capture update

## Included changes

- Real Claude relationship assistant route retained and extended.
- Claude vision extraction for business cards and notes screenshots.
- Google Speech-to-Text v2 route for direct voice-note transcription.
- Browser-side iPhone HEIC/HEIF normalization attempt before image upload.
- Minimal on-the-spot Gmail capture support and partial-contact intake behavior.
- Expanded Intake Queue schema with capture type, extracted text, transcript, missing fields, and internal data trace.
- WP-branded Thank-You Card Studio with pending relationship-touch persistence.
- Guardrails: human_review_required true, execution_allowed false, pending_human_review / pending_approval states.
- Hostile review documentation for AI/OCR/audio/thank-you changes.

## Validation run

- npm install --ignore-scripts: passed
- npm run build: passed
- npm run validate:all: passed

## Not claimed

Provider runtime calls are not live-proven inside this container. Deployed Google Speech-to-Text, Claude vision, and Claude thank-you generation require configured Cloudflare secrets, provider billing/credits, and live smoke tests.
