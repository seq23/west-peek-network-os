# Repo Validation Matrix

Hard proof commands:


- `npm run validate:predeploy:full` — source/static/build/contract/docs hygiene and Tier 4-ready dry-run proof.
- `npm run validate:postdeploy:strict` — Tier 3 deployed smoke/safety check with explicit deployed URL.
- `npm run tier4:ultimate-live-proof` — Tier 4 postdeploy live provider + data proof.
- `npm run release:proof` — wrapper that runs predeploy, then postdeploy if a deployed URL is provided, then Tier 4 only when `TIER4_ULTIMATE_LIVE_PROOF=1` is set.


## Static/predeploy hard fail validators

- `validate:no-generated-artifacts`
- `validate:artifact-manifest-current`
- `validate:google-private-key-contract`
- `validate:no-raw-atob-errors`
- `validate:oauth-connect-contract`
- `validate:provider-error-contract`
- `validate:tier4-live-proof-contract`
- `validate:tier4-lane-registry`
- `validate:tier4-report-schema`
- `validate:docs-match-package-scripts`
- `validate:repo-matrix-consistency`
- `validate:no-localhost-defaults`
- `validate:tier-docs-current`
- `validate:tier4-docs-complete`

## Tier 4 lanes

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

## Validator Simplification Update — 2026-06-12

Primary release gates are now:

- `npm run validate:predeploy:full`
- `npm run validate:postdeploy:strict`
- `npm run tier4:ultimate-live-proof`
- optional wrapper: `npm run release:proof`

The legacy `validate:hostile-master-addendum` exact-token audit is archived as informational only. It no longer blocks release because the repo now uses targeted docs/package/matrix/Tier 4 contract validators that fail on actual omissions instead of wording drift.

Tier 4 live-provider requirements remain hard requirements during Tier 4. They are not predeploy blockers when deployed URL, OAuth state, Gmail evidence, or live provider credentials are intentionally absent.

### Wrapper exclusion rule

Convenience wrappers (`release:proof`, `test:everything`, `validate:predeploy:full`, `validate:postdeploy:strict`) are package entrypoints, not matrix rows. They are excluded from `_repo_validation_matrix.json` to prevent recursive/self-nesting validation loops. Target validators and proof lanes remain represented in the matrix.
