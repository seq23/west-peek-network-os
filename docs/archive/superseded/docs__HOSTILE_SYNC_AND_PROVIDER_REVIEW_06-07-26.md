<!-- ARCHIVED: superseded by active runbooks / ledgers. See docs/archive/ARCHIVE_INDEX.md and docs/DOCS_CONSOLIDATION_MAP.md. -->

# Hostile Sync + Provider Review — 2026-06-07

## Findings

1. **App/UI was still local-first.** Manual add, intake review, approvals, and notification read actions could remain in browser localStorage even though provider routes wrote to Google Sheets. This meant spreadsheet edits would not reliably appear in the app and app actions would not reliably reach the spreadsheet.
2. **Google Sheets was append-only without latest-row collapse.** Approval/read/intake review actions append rows, so reads need to collapse by record id and latest timestamp to avoid stale status surfaces.
3. **Intake review status fields were missing from sheet headers.** Converted/attached/dismissed rows needed `reviewed_by`, `reviewed_at`, `converted_contact_id`, `attached_contact_id`, and `dismiss_reason` columns.
4. **Manual write routes needed authenticated operator context.** Contact/intake/approval/notification write routes now require the signed Google session instead of trusting browser-provided actor fields.
5. **HEIC support was only best-effort.** The app now lazy-loads `heic2any` if native browser decoding fails, then uploads JPEG to the server. Server still blocks raw HEIC reaching Claude because Claude vision does not accept raw HEIC safely.

## Fixes Applied

- Added `GET /api/sheets/snapshot` to read live Google Sheets tabs and return latest row per id.
- Added `POST /api/intake/review` to convert, attach, or dismiss intake in Google Sheets using append-only status rows.
- Added `src/services/sheetsClient.ts` and rewired the app to read from Sheets on load/refresh and after write actions.
- Rewired manual add, manual trigger intake, intake review, approval decisions, and notification read status to API routes that persist to Sheets.
- Added Settings refresh control so direct spreadsheet edits can be pulled into the app.
- Added HEIC fallback conversion via lazy `heic2any` import before upload.
- Expanded validators to require the new sheet snapshot/review sync surfaces.

## Remaining Runtime Truth

- Google Sheets sync is structurally wired, but live read/write requires deployed Cloudflare secrets and an authenticated Google session.
- Claude Vision OCR requires Anthropic API credits/secrets.
- Google Speech-to-Text requires Google Cloud Speech API enabled, project id, billing/free-tier eligibility, and service-account permissions.
- Playwright browser validation could not run in the container because Chromium was not installed.
