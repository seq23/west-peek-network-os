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


## Phase 7 Pitch Lab handoff

Added signed `/api/intake/pitch-lab` receiver. It creates pending intake rows only and never auto-creates contacts. See `docs/PITCH_LAB_HANDOFF_CONTRACT.md`.


## Phase 9C Network OS Review

- Added `docs/PHASE_9C_NETWORK_OS_HANDOFF_REVIEW.md`.
- Added `tests/domain/pitch-lab-handoff.mjs`.
- Added `npm run test:pitchlab-handoff` and `npm run validate:9c`.
- Tightened receiver replay/origin guard in `functions/_shared/pitchLabIntake.ts`.
- No CRM duplication, no contact auto-create, no scoring, no new UI surface.


## Phase 9D Pitch Lab Shared Secret Sync — Correct Source ZIP

Source ZIP: `west-peek-network-os-main_BASELINE_06-09-26_0000002.zip`.

- Synced `PITCH_LAB_SHARED_SECRET` into `secrets/network-os.local.env.gpg` using the existing encrypted local secrets workflow.
- Added `PITCH_LAB_SHARED_SECRET` to `scripts/secrets/required-keys.txt`.
- Added `docs/PITCH_LAB_SHARED_SECRET_SYNC_AUDIT.md`.
- Added `.npmrc` with `fund=false` to suppress non-actionable npm funding notices during install.
- Plaintext `.env.local` was deleted before packaging.
- Build and validation passed after dependency install.

Not proven: deployed Cloudflare secret presence, live deployed Pitch Lab → Network OS handoff, GitHub Actions status.
