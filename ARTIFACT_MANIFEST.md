# ARTIFACT MANIFEST

- Repo: `west-peek-network-os`
- Current artifact name: `west-peek-network-os-main_BASELINE_06-14-26_a7c9d3e1.zip`
- Source ZIP: full baseline snapshot from the validated repo root
- Repo root: `west-peek-network-os-main/`
- Changed files: shared Gmail sync control on Dashboard, Intake Queue, and Settings; clear Sheets-refresh versus Gmail-import explanations; exact three-mailbox server allowlist; sequential mailbox sync; partial-failure isolation; repeated-click lock; mailbox identity verification; automatic Intake refresh; narrow post-cleanup integrity handling; hostile browser/static contracts; operator runbook and review documentation
- Generated artifacts excluded: `.git`, `node_modules`, build outputs, logs, diagnostics, browser evidence, active environment files, decrypted auth state, and `tsconfig.tsbuildinfo`
- Validation status: TypeScript, production build, critical UI/data-flow contract, authenticated usability contract, validator admission, UI/test parity, artifact manifest, generated-artifact exclusion, and baseline packaging checks passed; hostile browser tests are collected but require local real-browser execution because this runtime cannot launch an admitted Playwright Chromium
- Proof limits: local real-browser hostile Gmail UI execution, deployed multi-mailbox OAuth/provider behavior, CI, and deployment remain local/deployed gates
- Revision: `a7c9d3e1`
- Date: `2026-06-14`
- Status: `STRUCTURALLY CHECKED — LOCAL BROWSER VALIDATION REQUIRED`
