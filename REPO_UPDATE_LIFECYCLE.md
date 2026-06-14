# REPOSITORY UPDATE AND RELEASE LIFECYCLE

**Repo:** `west-peek-network-os`  
**Status:** ACTIVE / OPERATOR ENTRY POINT  
**Purpose:** Give a new chat or operator one authoritative map for applying a baseline ZIP and closing the release lifecycle.

## 1. Product lane

- Audit model: **authenticated-first**.
- Source of truth: the approved baseline ZIP and repo-local `_repo_update_contract.json`.
- Terminal mode: one command at a time; Juniper interprets output and chooses the next command.

## 2. Update-time lifecycle

1. Confirm repo identity: `pwd`, Git root, repo name, remote, branch, and working tree.
2. Confirm ZIP identity, root structure, checksum, and snapshot mode.
3. Run updater preflight and create a rollback checkpoint.
4. Apply the ZIP with the contract-driven updater.
5. Restore local environment/auth state where applicable.
6. Run `npm run release:validate:container`.
7. Run `npm run release:self-heal`.
8. Run `npm run release:hallmark`. Hallmark is mandatory before deploy.
9. Run `npm run release:prepush`.
10. Commit, push, and verify GitHub Actions/deployment.
11. Run `npm run release:close-lifecycle`.

## 3. One-command lifecycle closure

`npm run release:close-lifecycle` executes this repo-specific sequence:

1. `npm run release:postpush`
2. `npm run release:live-proof` — Tier 4 postdeploy provider/data testing and controlled test-data population
3. `npm run postdeploy:authenticated-click-audit` — populated-state audit against the matching Tier 4 run
4. `npm run release:cleanup` — exact registered-fixture cleanup
5. `npm run postdeploy:authenticated-click-audit` — post-cleanup integrity audit
6. `npm run release:report`

The orchestrator:

- writes logs and `summary.json` under `artifacts/diagnostics/lifecycle-close/<run-id>/`;
- uses one proof-run identifier across proof and cleanup;
- attempts exact cleanup even when a prior live-proof stage fails;
- does not run a post-cleanup audit unless cleanup passed;
- always attempts the final proof report;
- exits nonzero if any required stage fails.

Validate wiring without touching production:

`npm run release:close-lifecycle:dry-run`

## 4. Completion boundary

`release:close-lifecycle` is a deployed/live command. It requires the repo's real deployed URL, provider inputs, and session state where applicable. A dry run proves wiring only. `COMPLETE` still requires the generated final proof matrix to contain no unproven applicable lane.

## 5. Operator lookup

- Machine-readable lifecycle: `_repo_update_contract.json`
- Validator severity/admission: `_repo_validation_matrix.json`
- Documentation authority: `DOCUMENTATION_AUTHORITY_INDEX.md`
- Terminal commands: `TERMINAL_RELEASE_RUNBOOK.md`
- This lifecycle entry point: `REPO_UPDATE_LIFECYCLE.md`

## 6. Network OS Tier 4 cleanup map

- Routine lifecycle closure: `npm run release:close-lifecycle` — uses one exact run ID for proof and cleanup.
- Most recent completed proof report: `npm run tier4:cleanup:latest:preview`, then `npm run tier4:cleanup:latest`.
- Known exact run ID: `npm run tier4:cleanup:preview -- <run-id>`, then `npm run tier4:cleanup -- <run-id>`.
- Historical recovery only: `npm run tier4:cleanup:historical:preview`, then `npm run tier4:cleanup:historical`.
- Authoritative safety details: `TIER4_PROOF_FIXTURE_CLEANUP.md`.


## Canonical West Peek brand authority

- [`WEST_PEEK_BRAND_SYSTEM.md`](WEST_PEEK_BRAND_SYSTEM.md) — locked cross-suite visual system and Hallmark acceptance criteria.

## Pre-updater artifact gate

Before any baseline ZIP is applied, follow:

`docs/runbooks/PRE_UPDATER_BASELINE_CHECKLIST.md`

A failed required-file, secret, generated-artifact, ZIP-integrity, or root-layout check blocks updater execution.

## 7. Locked lifecycle proof rules

- There is no pre-Tier-4 authenticated route audit. The first authenticated audit runs only after Tier 4 has populated controlled production-shaped test data.
- Desktop covers every authenticated route. Mobile covers the seven declared high-risk/data-heavy routes.
- The populated audit must match the successful Tier 4 proof run ID and detect raw HTML, malformed encoding, JSON/debug leakage, unbounded long text, horizontal overflow, and column collisions.
- The second authenticated audit runs only after exact cleanup and proves real data/UI integrity remains intact.

## Container Browser Unavailable — Mandatory Snapshot/Screenshot Fallback

When `test:environment-doctor` reports that Chromium cannot run in the assistant container, do not attempt repeated browser installation. Run `npm run validate:container-snapshot-fallback` and preserve its report. This fallback validates route/render contracts, production-shaped data normalization, critical UI flows, static Playwright coverage, package integrity, and inventories available screenshot evidence. It does not prove live DOM rendering or responsive layout. Final browser screenshots and full `release:prepush` remain mandatory in the local updater environment.


## LOCKED SUITE LIFECYCLE ADDENDUM — 2026-06-14

See `docs/runbooks/SUITE_RELEASE_LIFECYCLE_CONTRACT.md`. The final artifact must pass `release:prepush` before delivery; the updater is a confirmation gate, not the first defect-discovery environment.
