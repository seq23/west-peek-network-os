# Capture Routes: OCR, Voice, Minimal Gmail, and Thank-You Cards

This update restores Scooter’s original intent: people can be added on the fly from the format they actually show up in.

## Supported routes

- Minimal on-the-spot Gmail trigger: `#wpnetwork` can be the whole capture when speed matters. The app should infer name/email from Gmail envelope when available and leave missing fields for review.
- Reply in an existing thread.
- Forward an email to yourself with private context.
- Send yourself a standalone note.
- Upload a business card or notes screenshot for Claude vision OCR/extraction.
- Upload a voice note for Google Speech-to-Text transcription, then Claude structuring.
- Create a WP-branded virtual thank-you card/touch.

## Provider routing

- Claude/Anthropic: relationship reasoning, card/screenshot OCR extraction, thank-you drafting.
- Google Speech-to-Text v2: direct audio transcription. Requires `GOOGLE_CLOUD_PROJECT_ID`, service account email, and private key.
- HEIC/HEIF: accepted in the browser. The UI attempts client-side normalization to JPEG before upload because Claude vision accepts JPEG/PNG/WEBP/GIF, not raw HEIC as the primary provider format.

## Safety posture

All routes return or persist `human_review_required: true` and `execution_allowed: false`. No route sends an email, card, gift, or vendor order automatically. Upload captures create Intake Queue drafts. Thank-you cards create pending relationship touches.

## Deployed smoke tests

Run after secrets are present in Cloudflare:

1. Upload a JPG card in Cards / Screenshots / Voice. Confirm Intake Queue row with `pending_human_review`.
2. Upload an iPhone HEIC from Safari/Photos. Confirm client-side JPEG normalization or clear unsupported-browser error.
3. Upload an M4A voice memo. Confirm Google Speech-to-Text transcript and Claude structured fields.
4. Create a Thank-You Card. Confirm relationship_touches row with `pending_approval` and no automatic send.
