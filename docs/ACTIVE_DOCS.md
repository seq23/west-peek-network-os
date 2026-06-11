# Active Documentation Index — west-peek-network-os

Status: ACTIVE
Purpose: single operator entrypoint that prevents doc sprawl. If a document is not listed here or mapped in `docs/DOCS_CONSOLIDATION_MAP.md`, it is not an active operating authority.

## Active operating surfaces
- `ARCHITECTURAL_DECISIONS.md`
- `ARTIFACT_MANIFEST.md`
- `COMPLEXITY_LEDGER.md`
- `E2E_REQUIRED_TEST_MATRIX.md`
- `ENVIRONMENT_VARIABLES.md`
- `HOSTILE_REVIEW_AND_MASTER_ADDENDUM_CROSSCHECK.md`
- `KNOWN_EDGE_CASE_INVENTORY.md`
- `PLACEHOLDER_LEDGER.md`
- `README.md`
- `REPO_IDENTITY.md`
- `REPO_PRODUCT_PROMISE_LEDGER.md`
- `REPO_VALIDATION_MATRIX.md`
- `docs/HOSTILE_FLEXIBLE_INTAKE_REVIEW_06-07-26.md`
- `docs/PHASE_9C_NETWORK_OS_HANDOFF_REVIEW.md`
- `docs/PITCH_LAB_HANDOFF_CONTRACT.md`
- `docs/PITCH_LAB_PROFILE_LEAD_CAPTURE_CONTRACT.md`
- `docs/cumulative-build-spec.md`
- `docs/data-schemas.md`
- `docs/instructions-page-content.md`
- `docs/playwright-local-testing.md`
- `docs/provider-contracts.md`
- `docs/runbooks/deployment-cloudflare.md`
- `docs/runbooks/environment-setup.md`
- `docs/runbooks/postdeploy.md`
- `docs/runbooks/validation-operations.md`
- `docs/secrets-and-cloudflare.md`

## Operator rule
- Start here, then use the root ledgers and `docs/runbooks/*` for execution.
- Archived docs are historical only unless an active validator still references them and the consolidation map says so.
- New docs require an entry in `docs/DOCS_CONSOLIDATION_MAP.md`; otherwise `npm run validate:docs-consolidation` fails.
