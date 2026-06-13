# Validator Simplification Policy

Status: ACTIVE

This repo uses three primary validation entrypoints:

1. `npm run validate:predeploy:full` — source/static/build/Tier-4-readiness proof before deploy.
2. `npm run validate:postdeploy:strict` — deployed runtime smoke/safety proof after deploy.
3. `npm run tier4:ultimate-live-proof` — live deployed OAuth/Gmail/Sheets/provider/data proof.

`npm run release:proof` is a convenience wrapper around those gates. It does not convert predeploy checks into Tier 4 proof.

## Archived brittle validator

`npm run validate:hostile-master-addendum` is archived as an informational legacy audit. It is not a release gate.

Reason: it depended on exact document tokens and duplicated stronger targeted validators. It produced hard failures for wording drift rather than product, security, provider, or proof-risk failures.

Replacement gates:

- `npm run validate:docs-match-package-scripts`
- `npm run validate:repo-matrix-consistency`
- `npm run validate:tier-docs-current`
- `npm run validate:tier4-docs-complete`
- `npm run validate:tier4-live-proof-contract`
- `npm run validate:tier4-lane-registry`
- `npm run validate:tier4-report-schema`

## Blocking rule

A validator should block release only if it protects a real product, security, persistence, deployment, proof-layer, or artifact-integrity risk.

Validators should not hard-fail for:

- stale prose tokens when the structured docs/matrix validators pass;
- generated report residue that is already handled by `validate:no-generated-artifacts`;
- live provider requirements during predeploy;
- postdeploy requirements without an explicit deployed URL;
- Tier 4 live evidence before the operator intentionally runs Tier 4.

Live provider proof remains mandatory for Tier 4, but Tier 4 is postdeploy-only and must block inside `npm run tier4:ultimate-live-proof`, not inside predeploy/source validation.

## Wrapper commands are not matrix rows

Convenience wrappers such as `release:proof`, `test:everything`, `validate:predeploy:full`, and `validate:postdeploy:strict` are intentionally excluded from `_repo_validation_matrix.json` to avoid recursive validation loops and petty hard failures. The matrix tracks target proof lanes and validators. Wrappers orchestrate those lanes.
