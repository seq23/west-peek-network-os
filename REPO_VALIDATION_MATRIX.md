# Repo Validation Matrix — West Peek Network OS

Status: CURRENT — 2026-06-10  
Repo: `west-peek-network-os`  
Complexity: Level 4/5 hybrid — database-backed relationship OS with public event intake and signed Pitch Lab ingestion  
Release gate: `npm run validate:all`  
Build-inclusive release gate alias: `npm run validate:release`

## Locked Validation Principle

Network OS is the database of record. Self-submitted details from Pitch Lab, public event forms, founder/community forms, and future network forms must automatically write to a database-backed profile/intake event. Approval gates downstream action only. Approval must not gate intake persistence.

Human review may govern outreach, routing, invitations, introductions, curated lists, publishing, or external communication. Human review must not block saving intake.

No email notification is required in this build.

## Severity Definitions

- HARD FAIL: blocks release/updater-ready status because it affects security, privacy, data integrity, consent, deployability, runtime persistence, or a current user-critical journey.
- STRONG WARNING: does not always block structural handoff, but must be resolved or explicitly accepted before production release.
- WARNING: quality, polish, documentation, or non-critical proof gap.
- INFO / NO VALIDATION: optional future work or human-review-only observation.

## Matrix

| Validator / Test | Command | Category | Severity | Production Risk | What It Proves | What It Does Not Prove | Failure Handling | Owner Decision Needed? |
|---|---|---:|---|---|---|---|---|---|
| Repo structure | `npm run validate:structure` | Static | HARD FAIL | Missing required functions, docs, Sheets contracts, or public event routes | Required source files and core route fragments exist | Browser/runtime/provider behavior | Fix source contract | No |
| Secret scan | `npm run validate:secrets` | Security | HARD FAIL | Plaintext real secrets committed | Artifact does not include obvious plaintext secret files/values | Cloudflare secret correctness | Remove/rotate/regenerate clean artifact | Yes if real secret found |
| Domain workflows | `npm run test:domain` | Static/domain | HARD FAIL | Core workflow contracts drift | Required workflows, review gates, event capture, thank-you/touch guardrails are present | Browser journeys and live Sheets writes | Fix source/tests | No |
| Pitch Lab packet handoff | `npm run test:pitchlab-handoff` | Contract/security | HARD FAIL | Stale or unsafe Founder Story Packet intake | Signed packet contract, replay guard, Network OS database profile write/link, no email, no stale `pitch_practice`/`deal_flow` mapping | Live Pitch Lab deployment, browser share flow | Fix receiver/helper/docs | No |
| Pitch Lab profile lead | `npm run test:pitchlab-profile-lead` | Contract/privacy | HARD FAIL | Profile-gate lead not persisted or leaks pitch answers | `founder_profile_lead` is accepted, validates founder fields, writes/links profile, appends intake, excludes pitch answers | Live provider write | Fix endpoint/helper/profile store | No |
| Public event database intake | `npm run test:event-database-intake` | Contract/persistence | HARD FAIL | Event form submission fails to create database-backed profile/intake | Public event form upserts/links profile by email, appends event intake, requires no approval before storage, keeps `execution_allowed=false` | Browser form run or live Sheets write | Fix public event route/profile store | No |
| Build | `npm run build` via `npm run validate:all` | Build/deploy | HARD FAIL | TypeScript/Vite build fails | Source compiles and static app builds locally | Deployed Cloudflare runtime, secrets, browser E2E | Fix compile/build issue | No |
| Playwright max-depth coverage audit | `npm run validate:playwright:maxdepth` | E2E coverage audit | STRONG WARNING unless required by release scope | Master Playwright suite missing or materially shallow | Suite file/coverage intent exists | Actual browser pass/fail | Add/update Playwright suite or run actual E2E | Maybe |
| Browser E2E | `npm run test:e2e:maxdepth` | Browser/runtime | STRONG WARNING for structural handoff; HARD FAIL for production COMPLETE | Critical UI, forms, and journeys may break in browser | Local browser journey proof when run | Production deployment proof | Fix route/UX/runtime behavior | Maybe |
| Live Sheets/provider E2E | `npm run test:e2e:live` | Provider/runtime | STRONG WARNING unless production release requires live proof | Google Sheets write/read or provider env may fail | Live provider path when configured | Full production scale/security | Fix env/provider/code | Yes if real provider writes are involved |
| GitHub Actions | `gh run list --limit 20` after updater push | CI | HARD FAIL for COMPLETE when Actions exist | CI fails after local pass | Workflow status from GitHub | Deployed app behavior unless workflow tests it | Inspect failed logs and patch exact failure | No |
| Postdeploy smoke | configured deployment smoke/E2E | Deployment | STRONG WARNING / HARD FAIL for production release | Cloudflare deployed runtime differs from local | Public deployed route health when run | Full transactional proof unless E2E covers it | Fix deployment/env/runtime | Maybe |

## Current Hard-Fail Rules

- Build failure in release validation environment.
- Plaintext real secret in artifact.
- Signed Pitch Lab request verification missing or broken.
- Timestamp/replay guard missing or broken.
- Stale Pitch Lab payloads accepted without documented compatibility mode: `capture_type=pitch_practice`, `trigger_intent=deal_flow`, or `pitch_story_card`.
- Pitch Lab profile lead does not upsert/link a database-backed profile.
- Pitch Lab profile lead does not append an intake event.
- Pitch Lab profile lead contains pitch answers.
- Pitch Lab Founder Story Packet does not require consent.
- Pitch Lab Founder Story Packet does not append/link to profile when possible.
- Self-submitted event/profile/founder intake requires approval before database write.
- Public event form submission does not upsert/link a profile by email.
- Intake persistence automatically triggers outreach, intro, email, invitation, external communication, or other execution.
- Runtime reports follow-up guaranteed.
- Runtime treats intake as an investment decision.
- Approval gate blocks intake persistence instead of downstream action.
- Matrix says a hard fail exists but release validation does not run it.

## Strong Warnings

- Existing profile updates are represented only by a linked intake event and not reflected in latest profile row metadata.
- Live Google Sheets proof not run.
- Browser Playwright not run.
- Postdeploy smoke/E2E not run.
- Stale docs retain old framing without a clear superseded header.

## Non-Blocking Warnings / Info

- Copy polish.
- Optional dashboard niceties.
- Future notification/digest ideas.
- Future routing/curation workflow.

## Current Acceptance Criteria

- Pitch Lab profile leads auto-write/link to Network OS database profile and intake event.
- Pitch Lab Founder Story Packets append/link to the existing profile where possible.
- Public event form submissions auto-write/link to Network OS database profile and intake event.
- Approval gates downstream action only.
- Execution remains false unless a future operator workflow explicitly changes it.
- No email notification is required.
- No direct contact/outreach/follow-up claim is made by intake persistence.

---

## Master Addendum Validation Overlay — 2026-06-11

Machine-readable matrix: `_repo_validation_matrix.json`.

Canonical orchestrator:

```bash
npm run validate:everything
```

Tier 1 CI/static path:

```bash
npm run validate:everything -- --tier=1
```

Current container proof: Tier 1 validate:everything PASS in container; build/Playwright/postdeploy/live Gmail not run.

Postdeploy and live provider lanes are separate proof layers and must not be implied by local/static validation.
