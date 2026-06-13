# Artifact Manifest

## Current baseline

- ZIP: `west-peek-network-os-main_BASELINE_06-13-26_ba238a32.zip`
- Source ZIP: `west-peek-network-os-main_BASELINE_06-13-26_e6a4c9b1.zip`
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
