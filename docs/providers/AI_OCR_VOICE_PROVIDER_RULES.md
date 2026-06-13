# AI / OCR / Voice Provider Rules

AI, OCR, and voice lanes are review-only. They may produce suggestions, intake rows, or transcripts, but must not auto-execute email, vendor, payment, or relationship actions.

If an optional provider is not configured, Tier 4 may accept a controlled unavailable state only when explicitly allowed. Raw provider stack traces are hard failures.

Provider lane anchors: /api/gmail/sync; Gmail trigger sync; operator-seeded Gmail; Google Sheets read/write; Claude Vision OCR; Google Speech-to-Text; execution_allowed=false; human_review_required; Header spoofing is not accepted; Tier 4 is postdeploy only; Ultimate Live E2E provider + data proof.
