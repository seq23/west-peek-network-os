# Artifact Manifest

## Current baseline

- ZIP: `west-peek-network-os-main_BASELINE_06-13-26_c3f6a812.zip`
- Source ZIP: `west-peek-network-os-main_BASELINE_06-13-26_c3f6a812.zip`
- Repo root: `west-peek-network-os`
- Mode: full snapshot baseline

## Changed files

- `src/styles.css`
- `src/ui/App.tsx`
- `src/ui/Dashboard.tsx`
- `src/ui/AddPerson.tsx`
- `src/ui/CaptureStudio.tsx`
- `src/ui/Events.tsx`
- `src/ui/Instructions.tsx`
- `src/ui/ThankYouStudio.tsx`
- `tests/e2e/network-os.spec.ts`
- `tests/e2e/provider-failure-auth-mobile-edge.spec.ts`
- `HALLMARK_GLOBAL_ROUTE_REMEDIATION_2026-06-13.md`
- `ARCHITECTURAL_DECISIONS.md`

## Generated artifacts excluded

- `node_modules/`
- `dist/`
- `playwright-report/`
- `test-results/`
- `logs/`
- `reports/`
- `artifacts/diagnostics/`
- `tsconfig.tsbuildinfo`

## Validation status

- TypeScript: passed
- `validate:all`: passed
- `verify:fast`: passed
- production build: passed
- provider-independent integration: passed
- Playwright coverage admission: passed
- full Chromium execution: local validation required

## Proof limits

Not proven in sandbox:

- local Chromium rendering after Hallmark remediation
- deployed route rendering after this artifact is pushed
- live Gmail / Google Sheets
- cross-instance concurrency
- final authenticated Hallmark browser recapture

## Hallmark global route refinement artifact

- Baseline ZIP: `west-peek-network-os-main_BASELINE_06-13-26_c3f6a812.zip`
- Source ZIP: `west-peek-network-os-main_BASELINE_06-13-26_c3f6a812.zip`
- Repo root: `west-peek-network-os`
- Changed files: `src/ui/App.tsx`, `src/ui/Dashboard.tsx`, `src/styles.css`, `ARCHITECTURAL_DECISIONS.md`, `HALLMARK_GLOBAL_ROUTE_REFINEMENT_2026-06-13.md`, `ARTIFACT_MANIFEST.md`
- Generated artifacts excluded: `node_modules/`, `dist/`, `playwright-report/`, `test-results/`, `logs/`, `artifacts/`, `.auth/`, `tsconfig.tsbuildinfo`
- Validation status: sandbox-safe validators and production build passed; local Chromium validation required
- Proof limits: deployed visual rendering, authenticated Hallmark recapture, live providers, GitHub Actions, and Cloudflare runtime are not proven by this package


## Auth-state vault addition

This baseline adds external encrypted authenticated-state backup/restore plus shared Tier 4 and Hallmark wrappers. No decrypted storage state, cookies, or auth ciphertext are included in the baseline ZIP.


## Hostile auth-vault verification correction

- Corrected GPG passphrase handling to use file descriptor input rather than process arguments.
- Added Hallmark runner capability validation for `--storage-state`.
- Added non-secret Tier 4 provider-input preflight disclosure.
- Revalidated encrypted backup/delete/restore, Hallmark wrapper wiring, Tier 4 environment wiring, secret non-disclosure, shell syntax, TypeScript, secret scan, documentation parity, and validator admission.
- Authentication restoration serves both Hallmark and Tier 4; provider-specific Tier 4 inputs and Gmail seed messages remain independently required.
