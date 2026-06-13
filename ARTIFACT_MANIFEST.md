# Artifact Manifest — west-peek-network-os

Current artifact name: `west-peek-network-os-main_BASELINE_06-12-26_9f3a1d2b.zip`

Source ZIP: `west-peek-network-os-main_BASELINE_06-12-26_c2a07e9b.zip`

Repo root: `west-peek-network-os-main` / packaged root containing `package.json`, `REPO_IDENTITY.md`, validation docs, source, functions, tests, and scripts.

Changed files: Google private-key parser/validators, Tier 4 orchestrator and lane scripts, predeploy/postdeploy/release validation scripts, docs organization, validation matrices, artifact hygiene validators, and validation simplification/archived brittle audit handling.

Generated artifacts excluded: `reports/`, `test-results/`, `playwright-report/`, `dist/`, `build/`, `coverage/`, `.vite/`, `.cache/`, `.tmp/`, `tsconfig.tsbuildinfo`.

Validation status: static/source/container validation passed in container before delivery; live OAuth/Gmail/Sheets proof is not claimed until deployed Tier 4 passes.

Proof limits: static validators do not prove runtime, browser, provider, OAuth, Gmail, Sheets, or deployed Cloudflare behavior. Tier 4 live proof must run locally/deployed.
