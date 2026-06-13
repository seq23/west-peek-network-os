# Google OAuth and Gmail

The app uses Google OAuth and Gmail read-only ingestion. Gmail read-only means Tier 4 cannot seed its own email unless scopes are intentionally expanded. Operator-seeded Gmail messages are required.

Required evidence marker: `WEST_PEEK_E2E_RUN_ID`.

Supported trigger tags: `#wpnetwork`, `#addtowestpeek`, `#westpeeknetwork`, `#wpdealflow`, `#dealflow`.

OAuth connect live proof is lane `tier4-oauth-connect-live`. Gmail trigger proof is lane `tier4-gmail-trigger-ingestion-live`.

Provider lane anchors: /api/gmail/sync; Gmail trigger sync; operator-seeded Gmail; Google Sheets read/write; Claude Vision OCR; Google Speech-to-Text; execution_allowed=false; human_review_required; Header spoofing is not accepted; Tier 4 is postdeploy only; Ultimate Live E2E provider + data proof.
