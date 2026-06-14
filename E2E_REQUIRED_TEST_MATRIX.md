# E2E Required Test Matrix

Tier 2: local browser gauntlet where possible.
Tier 3: postdeploy strict smoke and safe routing.
Tier 4: postdeploy only, Ultimate Live E2E provider + data proof.

Required Tier 4 lanes:

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

## Tier 4 / Max-depth anchor coverage update

Capstone product lifecycle gauntlet: required in Tier 2/Tier 4 proof.
No automatic contact: Gmail/Pitch Lab/public intake remains human-review until explicit action.
POSTDEPLOY: deployed smoke/safety is Tier 3 and required before Tier 4.
UNPROVEN: missing provider/deployed evidence must be named honestly.


## Gmail forward-only deployed proof

`npm run release:gmail-forward-only-proof` is the admitted normal-mode provider proof after Gmail ingestion lifecycle changes. It uses real Gmail, deployed Cloudflare Workers, permanent Sheets ledger/watermark/cursor records, exact Intake cleanup, and a second sync to prove deleted Intake rows do not re-import. Tier 4 proof mode is not a substitute for this lane.
