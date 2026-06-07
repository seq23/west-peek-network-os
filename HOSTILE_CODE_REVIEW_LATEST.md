# Hostile Code Review — Latest Baseline 2026-06-07

Scope reviewed:
- Claude AI suggestion route
- Claude Vision OCR card/screenshot capture
- Google Speech-to-Text voice-note capture
- HEIC/HEIF browser normalization path
- Thank-You Card Studio
- Google Sheets sync, snapshot, and Settings spreadsheet link
- Mike demo seed route
- How to Add People instructions

Findings fixed in this pass:
1. Spreadsheet schema drift risk: app reads/writes now repair required tab headers before Google Sheets reads/appends.
2. Manual add was too strict for partial capture: name-only/name+email contacts can now be saved with default enrichment-needed context.
3. Card/screenshot capture UI did not explicitly distinguish business cards from notes screenshots: added image type selector.
4. Settings copy referenced outdated Team launchpad and unsupported settings/audit-log persistence claims: corrected to Operator Login and implemented tabs.

Current guardrails verified structurally:
- Provider routes require authenticated signed Google session.
- Claude/Google provider calls return human_review_required true / execution_allowed false.
- OCR/audio/thank-you outputs persist as pending review rows, not executed actions.
- Sheet snapshot collapses append-only update rows by latest timestamp.
- Direct spreadsheet edits can be pulled into the app with Settings → Refresh from Google Sheets.
- App write actions append to Google Sheets via authenticated API routes.

Validation run:
- npm install --ignore-scripts: passed
- npm run build: passed
- npm run validate:all: passed

Not claimed:
- Live Claude Vision provider success
- Live Google Speech-to-Text provider success
- Browser Playwright runtime success in this container
- Cloudflare deployed smoke-test success

Those require deployed Cloudflare secrets, enabled provider APIs/billing, Google auth session, and real test media.
