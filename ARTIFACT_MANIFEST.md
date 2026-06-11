# Artifact Manifest — west-peek-network-os

Artifact: `west-peek-network-os-main_BASELINE_06-11-26_nogit.zip`
Repo: `west-peek-network-os`
Packaged root: repository root
Branch/SHA: not available in uploaded ZIP context; `nogit` used.
Mode: full baseline snapshot
Status: STRUCTURALLY CHECKED — LOCAL VALIDATION REQUIRED

## Change batch

- Fixed local validation failures found during West-first updater/test pass.
- Restored safe `.env.example` and `.env.local.example` files required by structure/env validators.
- Fixed docs consolidation validator to ignore generated/dependency folders such as `node_modules`, `dist`, `build`, `coverage`, Playwright output, logs, reports, and temp/cache folders.
- Added `@types/node` and `types: ["node"]` for TypeScript support in Node-backed E2E specs.
- Updated Playwright config for local system Chromium fallback via `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH`, default 127.0.0.1 base URL, no-video default to avoid ffmpeg-only failure, and safe launch args for root/container validation.
- Fixed Master Gauntlet button selectors to match actual app labels while preserving outcome assertions.
- Fixed provider-failure E2E harness so needs-more-info trigger items render through a controlled snapshot and generic OAuth-token wording is not treated as a secret leak.
- Made `test:e2e:live-gmail` skip-safe by default and added `test:e2e:live-gmail:real` for the real provider/evidence lane.
- Updated validator admission register for the live Gmail real-provider split.
- Streamed `validate:everything` child command logs through `tee` so long-running validators are diagnosable locally.

## Validation run in container

Passed:

- `npm ci`
- `npm run validate:everything -- --tier=1`
- `npm run typecheck`
- `npm run build`
- `npm run validate:playwright:maxdepth`
- `npm run validate:validator-admission`
- `npm run test:e2e:coverage-required` using `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/usr/bin/chromium`
- `npm run test:e2e:live-gmail` skip-safe lane: skipped as expected without real Gmail evidence
- `npm run env:remove`
- Local browser E2E chunks proving all `tests/e2e/network-os.spec.ts` lanes passed under system Chromium:
  - `group1`
  - `group2`
  - `group3`
  - missing route group for Intake Queue and How to Add People

Blocked / not fully run as one command in this container:

- Full `npm run validate:everything -- --tier=2` timed out at the container command boundary while running long Playwright lanes, after earlier static/type/build lanes passed. Constituent Tier 2 hard lanes were run separately as listed above.

Unproven:

- live Gmail/OAuth/Sheets ingestion with real credentials and evidence id
- Cloudflare Pages deploy
- GitHub Actions workflow status
- deployed/postdeploy smoke
- headed human visual review

## Packaging exclusions

Excluded from ZIP:

- `.git/`
- `node_modules/`
- `dist/`
- `build/`
- `coverage/`
- `playwright-report/`
- `test-results/`
- `logs/`
- `reports/`
- `.cache/`
- `.tmp/`
- raw `.env*` files except committed safe examples

