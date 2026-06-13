# Google Sheets Persistence

Google Sheets is the persistence layer. Tier 4 requires behavior-based write/readback proof, not secret printing.

Every Tier 4 write must include `WEST_PEEK_E2E_RUN_ID` so test rows are traceable. Required readbacks include OAuth token row, contact row, intake row, touch row, approval row, public event row, Pitch Lab row, and AI suggestion row when enabled.

Provider lane anchors: /api/gmail/sync; Gmail trigger sync; operator-seeded Gmail; Google Sheets read/write; Claude Vision OCR; Google Speech-to-Text; execution_allowed=false; human_review_required; Header spoofing is not accepted; Tier 4 is postdeploy only; Ultimate Live E2E provider + data proof.
