# Hostile Code Review — West Peek Network OS Baseline

## Review scope

Audited the baseline against the locked cumulative build spec, including updated Item #32 and the requested persistence/E2E standard.

Reviewer stance: hostile senior engineering architect, 15–20 years experience. Assume UI shells, fake persistence, and happy-path demos are not enough.

## Findings from prior artifact

1. Core screens existed, but several critical actions were still too close to static shell behavior.
2. Cloudflare Functions returned validated shapes but did not write to the selected V1 persistence layer.
3. Manual add could write to localStorage, but E2E did not prove persistence after reload.
4. Intake Queue could convert seeded records, but there was no UI path to create a new trigger intake item.
5. No E2E covered capture → intake → convert → contact → reload.
6. No E2E covered approval → notification resolution.
7. Runtime IDs used timestamp-only values, which can collide during rapid operations.
8. Google Sheets setup docs did not include row-1 headers, which would cause schema drift immediately.
9. Structure validation checked fragments, but not Sheets persistence surfaces or persistence E2E coverage.

## Fixes applied in this pass

1. Added stable ID generation:
   - `src/domain/ids.ts`
   - all generated records use timestamp + random suffix.
2. Hardened local workflow persistence:
   - manual add persists in localStorage
   - duplicate exact email/name+company protection
   - intake creation from pasted #wpnetwork text
   - intake conversion to contact
   - intake attach-to-existing action
   - touch/approval/notification creation when touch is needed
   - approval approve/reject flow
   - notification read/resolved flow
3. Added a real Intake Queue capture form:
   - creates local intake from pasted #wpnetwork text
   - supports persistence E2E without Gmail credentials
   - mirrors production intake shape
4. Added Google Sheets runtime persistence surface for Cloudflare Functions:
   - `functions/_shared/sheets.ts`
   - service-account JWT token exchange
   - append rows to Google Sheets
   - read contacts for duplicate checks
   - no plaintext secrets in repo
5. Hardened API functions:
   - `functions/api/intake/create.ts` writes intake records to Google Sheets when configured
   - `functions/api/contacts/create.ts` writes contacts and checks exact duplicate email from Sheets
   - `functions/api/approvals/decision.ts` records approval decisions to Sheets
   - `functions/api/notifications/read.ts` records notification read receipts to Sheets
6. Expanded E2E coverage:
   - dashboard action visibility
   - instructions trigger/examples
   - manual add persists after reload
   - duplicate exact email is blocked
   - intake capture converts to contact and persists after reload
   - approval decision resolves related notification state
7. Expanded validation:
   - `scripts/validate-structure.mjs` now checks Sheets persistence fragments and persistence E2E cases
   - `tests/domain/workflows.mjs` now checks persistence surfaces and E2E coverage fragments
8. Expanded Google Sheets setup docs:
   - exact tab names
   - exact row-1 headers
   - service account setup
   - share sheet with service account as Editor
   - required secret names

## What is real now

- Manual Add is functional in the baseline app.
- Duplicate protection is functional locally.
- Intake creation from raw #wpnetwork text is functional locally.
- Intake conversion to contact is functional locally.
- Touch creation is functional locally.
- Approval creation and approval decision flow are functional locally.
- Notifications can be marked read and resolved locally.
- Local persistence survives page reload through localStorage.
- Cloudflare API functions contain real Google Sheets write/read code paths when secrets are configured.
- Persistence E2E specs exist and target real UI actions.
- Google Sheets setup docs are operator-usable.

## Still not proven in this container

- Playwright browser execution, because this container could not download Chromium from Playwright CDN.
- Real Google Sheets writes, because no production Google credentials were provided here.
- Real Gmail API sync.
- Real Google OAuth login.
- Real Claude API calls.
- Real handwritten note vendor calls.
- Real transactional email sends.
- Cloudflare deployment.

## Production-readiness boundaries

This baseline is not falsely labeled COMPLETE.

It is stronger than a shell because local persistence and workflow paths are executable and covered by tests, and Cloudflare Functions now include actual Google Sheets persistence paths. But external provider runtime still requires local secrets, Google Sheet setup, Cloudflare setup, and provider validation.

## Honest status label

STRUCTURALLY CHECKED + LOCAL BUILD PASSED + DOMAIN WORKFLOW CHECKED + PERSISTENCE E2E SPEC ADDED — LOCAL PLAYWRIGHT/PROVIDER VALIDATION REQUIRED
