# RUNBOOK — west-peek-network-os

Read this before changing anything. It is the file an AI employee (Porter in West Peek OS,
Danielle in Boss OS) reads at plan time; `scripts/validate-runbook.mjs` fails the build if the
paths and scripts named here stop existing. It points at the deeper runbooks rather than
repeating them.

## What this repo is
**West Peek Network OS** — the private relationship app over the master network Google Sheet.
Partners call it "network os", "Network OS", "the network", "the network app" or "the contacts
sheet app".

| | |
|---|---|
| Hosting | Cloudflare **Pages** project `west-peek-network-os` (not a Worker); `wrangler.toml` sets `pages_build_output_dir = "dist"` |
| Hosts | https://network.joinwestpeek.com (custom domain) and https://west-peek-network-os.pages.dev |
| UI | Vite + React in `src/` (`src/ui/App.tsx`, `src/ui/Instructions.tsx`), built by `npm run build` into `dist/` |
| API | Pages Functions in `functions/`; auth gate in `functions/_middleware.ts`; Sheets I/O in `functions/_shared/sheets.ts` |
| Data | Google Sheets tabs; the header contract is `_sheets_schema_contract.json` |
| Access | Google OAuth; who may sign in is `ADMIN_EMAIL_ALLOWLIST` in `wrangler.toml`. Signed out, `/` answers 401; `/api/health` is public |

**Other repos write through this one.** A change to these routes changes someone else's product:

| Route | Called by |
|---|---|
| `functions/api/intake/site-form.ts` | join-west-peek-main's lead handler — every West Peek website form lands on the `contacts` tab |
| `functions/api/intake/pitch-lab.ts`, `functions/api/intake/pitch-lab-profile.ts` | west-peek-pitch-lab (see `docs/PITCH_LAB_HANDOFF_CONTRACT.md`) |
| `functions/api/sheets/snapshot.ts`, `functions/api/intake/create.ts` | West Peek OS's Network OS client |

`/api/health` (`functions/api/health.ts`) reports the site-form door's readiness under `siteFormIntake`.

## Standing rules (from this repo's own docs — cite, don't invent)
- **Pitch Lab writes `intake_queue`, never `contacts`**; a human converts it
  (ADR-2026-06-16-INTAKE-BOUNDARY in `ARCHITECTURAL_DECISIONS.md`). **Website forms write `contacts`
  directly** and update an existing email rather than duplicate it (`functions/_shared/siteFormIntake.ts`).
- **Canonical columns only.** Writes use the headers in `_sheets_schema_contract.json`; the policy is
  validate-only, no silent header repair. Guard: `npm run validate:sheets-schema-contract`.
- **No plaintext secrets.** Secrets live in `secrets/network-os.local.env.gpg` and Cloudflare;
  `docs/secrets-and-cloudflare.md` is the procedure. Guard: `npm run validate:secrets`.
- **The allowlist is configuration in `wrangler.toml`.** Add the plaintext var and deploy BEFORE
  deleting any encrypted secret of the same name, or production locks everyone out (comment in
  `wrangler.toml`).
- **One deploy path.** Cloudflare's Git integration is the only deployer; no Wrangler deploy
  workflow in GitHub (`docs/runbooks/deployment-cloudflare.md`).
- **Brand is locked**: `WEST_PEEK_BRAND_SYSTEM.md`. Guard: `npm run validate:brand-system`.
- **Every validator is admitted.** A new `validate`/`test`/`smoke`/`audit` script needs a row in
  `_validator_admission_register.json` (guard: `npm run validate:validator-admission`); to run in CI
  it also needs a tier1 row in `_repo_validation_matrix.json`. Every Markdown file needs a row in
  `docs/DOCS_CONSOLIDATION_MAP.md` (`npm run validate:docs-consolidation`).
- **Branches are `work/*`; merge only when every check is green, never `--admin`** (`AGENTS.md`).
- **Ask, don't decide**: who is on the allowlist, brand, copy meaning, anything that changes which
  tab a caller's data lands on. Code, tests, validators, docs: decide and record in the PR.

## How to make a change
1. Branch `work/<slug>` off `main`.
2. Edit under `src/` or `functions/`. A change to an intake route updates its test in `tests/domain/`
   (`tests/domain/site-form-intake.mjs`, `tests/domain/pitch-lab-handoff.mjs`,
   `tests/domain/pitch-lab-profile-lead.mjs`) in the same PR.
3. Run the CI gate locally: `npm run validate:everything -- --tier=1` (what
   `.github/workflows/validate.yml` runs on every PR; the lanes are the tier1 rows of
   `_repo_validation_matrix.json`). Also `npm run typecheck` and `npm run build`.
4. Commit, push, open the PR. The Cloudflare bot posts a preview at
   `https://<hash>.west-peek-network-os.pages.dev`.
5. `~/bin/land <pr>` verifies green, squash-merges and watches `main` to a terminal state.
6. Prove it live: the "Cloudflare Pages" check-run on the merge commit succeeded
   (`gh api repos/seq23/west-peek-network-os/commits/<sha>/check-runs`), then
   `curl -s https://network.joinwestpeek.com/api/health` answers `"ok": true` and
   `curl -sI https://network.joinwestpeek.com/` answers 401. The full deployed check is
   `POSTDEPLOY_BASE_URL=https://network.joinwestpeek.com npm run postdeploy:smoke`.

## How it deploys
Cloudflare Pages builds `main` on every push; no GitHub workflow deploys. Postdeploy and live
provider proof: `docs/runbooks/deployment-cloudflare.md`, `docs/operations/DEPLOYMENT_AND_POSTDEPLOY_RUNBOOK.md`,
`POSTDEPLOY_REAL_PROVIDER_RUNBOOK.md`. Rollback: `ROLLBACK_AND_CONTAINMENT_RUNBOOK.md`. Sheet
trigger incidents: `docs/SHEETS_TRIGGER_RECOVERY_RUNBOOK.md`. Full release lifecycle:
`TERMINAL_RELEASE_RUNBOOK.md`, `REPO_UPDATE_LIFECYCLE.md`.

## Guards, and what each pins
| Script | Pins |
|---|---|
| `scripts/validate-everything.mjs` | runs every tier1 row of `_repo_validation_matrix.json`; any HARD FAIL fails CI |
| `scripts/validate-structure.mjs` | required files, routes and runtime fragments exist |
| `tests/domain/site-form-intake.mjs` | the site-form door's mapping, secret gate, origin allow-list and update-not-duplicate |
| `tests/domain/pitch-lab-handoff.mjs` | the Pitch Lab handoff endpoints and their contract docs stay in step |
| `scripts/sheets/validate-schema-contract.mjs` | writes use canonical sheet headers |
| `tests/integration/trigger-sheet-safety.mjs` | Gmail trigger to sheet writes stay safe (`npm run validate:trigger-sheet-proof`) |
| `scripts/check-no-plaintext-secrets.mjs` | no plaintext secrets committed |
| `scripts/validate-validator-admission.mjs` | every validation script is admitted |
| `scripts/validate-runbook.mjs` | this file names real paths and scripts (`npm run validate:runbook`) |

Prove a new guard negatively before merging: plant the defect, watch it fail, remove it.
