# West Peek Network OS — Local Playwright Failure Remediation

**Date:** 2026-06-13  
**Source evidence:** `west-peek-network-os-playwright-evidence-2026-06-13.zip`  
**Reviewed run result:** 39 passed, 17 failed  
**Status:** SOURCE CORRECTIONS IMPLEMENTED — LOCAL MAC RERUN REQUIRED

## Failure classes found

1. Playwright container server waited on `127.0.0.1:3000` while `npm run dev:test` launched Vite on its default port.
2. Fresh snapshot requests used `?fresh=1`, but mocked route interception did not consistently include query-string variants. Mutations succeeded while fresh readback silently failed, leaving stale UI state.
3. Intake manual capture used a closed `<details>` element. Tests correctly located the textarea but could not interact with the hidden control.
4. Sheet maintenance required a confirmation dialog, but the E2E test did not accept it.
5. Operator copy drifted from the locked guidance and assertions.
6. The local container lane included live-production-only tests, mixing local fixture proof with Tier 4 proof.

## Corrections

- Explicitly launch Vite with `--host 127.0.0.1 --port 3000 --strictPort`.
- Exclude `*.live.spec.ts`, `live-*.spec.ts`, and Tier 4 specs from the local container configuration.
- Intercept `/api/sheets/snapshot` with query-string variants in fixture harnesses.
- Return explicit fixture freshness metadata.
- Open Manual Capture by default so the operator and automated tests can reach it directly.
- Accept the maintenance confirmation explicitly in the test.
- Align refresh, maintenance, and deal-flow guidance copy with the operator contract.

## Validation completed in sandbox

- `npm ci`: PASS
- `npm run verify:fast`: PASS
- `npm run validate:all`: PASS
- TypeScript: PASS
- Production build: PASS
- Browserless mocked web contracts: PASS
- Provider architecture integration: PASS
- Local provider-independent Master Gauntlet: PASS
- Playwright test discovery: PASS — 55 local/container tests across 5 files

## Proof boundary

The sandbox has no Chromium executable, so the corrected 55-test Playwright lane was not executed here. The next v3.1 updater run on the Mac must execute the corrected local browser lane. A passing local run is required before commit and push.
