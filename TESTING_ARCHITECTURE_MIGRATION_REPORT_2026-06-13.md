# West Peek Network OS — Testing Architecture Migration Report

**Date:** 2026-06-13
**Status:** PROVIDER-INDEPENDENT MIGRATION COMPLETE — LOCAL HEADED AND LIVE PROOF REQUIRED

## Implemented

- Generic capability scaffold reconciled with the existing repo stack.
- `_repo_update_contract.json` configured for generic v3.1 and `vault_required`.
- Canonical commands: `verify:fast`, `deep-validation`, `verify:local`, `release:prepush`, `release:postpush`, `release:live-proof`.
- Explicit provider modes: `fixture`, `local-adapter`, `live-provider`.
- Production-shaped Gmail fixture provider.
- Central intelligent-inbox classifier used by the live Gmail route.
- Twelve canonical Gmail fixtures with deterministic expected outcomes.
- Durable file-backed local Sheets provider with serialized writes, idempotency, fresh readback, maintenance, and cleanup.
- Isolated test-auth provider with production/non-local hard-stop.
- Provider architecture integration suite.
- Provider-independent local Master Gauntlet.
- Run-scoped diagnostics contract.
- Proof-fixture cleanup enforcement.
- Hallmark UX addendum and brand-preservation requirements.
- Canonical master plan, repo-specific addendum, validation matrix, Master Gauntlet, and architectural decisions updated.

## Defects found and corrected during execution

1. Duplicate `extracted_text` key in Gmail intake construction.
2. Company traction updates from founders were incorrectly classified as pitches.
3. SEO solicitation was incorrectly classified as generic noise instead of operational mail.
4. Fixture provider used TypeScript constructor parameter syntax unsupported by Node strip-only runtime.
5. Local Sheets adapter did not initially serialize concurrent writes.
6. `cleanup-expired` was a no-op scaffold.
7. Deep Validation duplicated the production build and timed out.
8. Secret-policy validation emitted noisy Git errors in unpacked ZIP workspaces.
9. Diagnostics documentation did not enumerate required filenames expected by its validator.

## Proven locally

- TypeScript typecheck.
- Production build.
- Existing `validate:all` stack.
- Twelve intelligent-inbox fixture outcomes.
- Explicit provider-mode enforcement.
- Test-auth production exclusion.
- Durable local Sheets readback.
- Ten-way concurrent local duplicate resistance.
- Maintenance second-run idempotency.
- Contact archive/restore.
- Event revoke/restore with attendee preservation.
- Approval and notification resolution.
- Exact proof-run cleanup.
- Diagnostics contract.
- Secret/vault contract.
- Documentation and validation-matrix consistency.
- Deep Validation completion with a declared browser environment gap.

## Not proven in this environment

- Headed Playwright and actual browser rendering.
- Hallmark evidence capture using the owner-maintained local ZIP.
- Human expert Hallmark review.
- Live Gmail and Google Sheets providers.
- Cloudflare deployment and cross-instance isolate race.
- GitHub Actions for this revision.
- Postdeploy provider proof.

## Canonical local continuation

1. Use generic v3.1 to apply the baseline.
2. Allow `release:prepush` to enforce repo-owned gates.
3. Run `npm run verify:local` for headed browser proof.
4. Run the Hallmark evidence tool against the local repo and complete expert review.
5. Run `npm run release:postpush` after push/deployment.
6. Run `npm run release:live-proof` only under guarded live-provider conditions.

## Hostile review correction — mocked sandbox lane

A hostile review found that the repo already mocked provider/network responses in Playwright, but those tests still required Chromium. A separate browserless mocked web-contract lane was added using a strict mocked `fetch` transport against the real client request/normalization module.

Also corrected:

- postpush now returns INCOMPLETE when no deployed base URL is supplied
- Deep Validation distinguishes browser-unavailable from configuration failure
- container Playwright no longer attempts a network browser download unless `PLAYWRIGHT_INSTALL_BROWSER=1` is explicitly set

## Local Mac Playwright remediation

The first real Mac browser run exposed 17 failures after 39 passes. Evidence review grouped them into self-spawn parity, stale fresh-read interception, hidden manual capture, confirmation-dialog handling, operator-copy drift, and proof-lane mixing. These root causes were corrected together. The corrected container/local configuration discovers 55 non-live tests across five files. A Mac rerun remains required because Chromium is unavailable in the sandbox.
