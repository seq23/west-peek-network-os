# ARTIFACT MANIFEST

- Repo: `west-peek-network-os`
- Current artifact name: `west-peek-network-os-main_BASELINE_06-14-26_5f0c2a19.zip`
- Source ZIP: full baseline snapshot from the hostile-reviewed repo root
- Repo root: `west-peek-network-os-main/`
- Changed files: deployed normal-mode Gmail forward-only runtime proof; runtime-proof cleanup ownership; permanent message ledger/watermark/cursor/lock preservation; server-managed failed-page retry; first-page cursor sentinel; persistent per-mailbox concurrency lock with losing-race release containment; proof-only Gmail seed/index verification; registered validator and release aliases; updated active runbooks, testing matrices, architectural decision record, hostile review, and complete documentation consolidation map
- Generated artifacts excluded: `.git`, `node_modules`, `dist`, build outputs, reports, logs, diagnostics, browser evidence, active environment files, decrypted auth state, test results, Playwright reports, and `tsconfig.tsbuildinfo`
- Validation status: full container prepush, trigger-sheet safety, strengthened Gmail result-summary UI/test parity, TypeScript, production build, provider lifecycle/error contract, cleanup contract, critical UI/data-flow contract, authenticated usability contract, validator admission, docs/package parity, browser-suite registry, Google private-key contract, and live runtime-proof test collection passed
- Proof limits: the deployed Gmail/Cloudflare/Sheets forward-only proof requires a connected approved mailbox, authenticated storage state, and temporary proof token with `gmail.send` plus `gmail.readonly`; local Gmail UI browser execution remains an updater gate because system Chromium blocks local navigation in this container
- Revision: `5f0c2a19`
- Date: `2026-06-14`
- Status: `STRUCTURALLY CHECKED — LOCAL REAL-BROWSER AND DEPLOYED PROVIDER VALIDATION REQUIRED`
