<!-- ARCHIVED: superseded by active runbooks / ledgers. See docs/archive/ARCHIVE_INDEX.md and docs/DOCS_CONSOLIDATION_MAP.md. -->

# Hostile Code Review — OAuth Session + Settings Controls 2026-06-07

Scope reviewed:
- Google OAuth callback and signed browser session creation
- Settings refresh buttons
- Google Sheets snapshot/maintenance auth path
- Cloudflare Pages cookie behavior risk
- Encrypted local environment bundle workflow

Findings fixed in this pass:
1. OAuth callback emitted multiple Set-Cookie headers during the callback. The Gmail token could be written while the signed browser session cookie failed to stick on Cloudflare Pages. The callback now emits one required production cookie: `wpn_session`.
2. Callback redirect is now explicitly `cache-control: no-store` and preserves the validated relative `next` path.
3. Settings/session/OAuth refresh fetches now explicitly include `credentials: 'same-origin'`.
4. The shared Google Sheets API client now includes `credentials: 'same-origin'` for snapshot reads and all authenticated write actions.
5. Domain validation now hard-fails if the OAuth callback reintroduces multiple callback cookies or if the Settings/Sheets client drops same-origin credentials.

Hostile checks added:
- Callback must contain exactly one `set-cookie` response header.
- Callback must set `wpn_session`.
- Callback must not import/use `clearCookieHeader`.
- Callback redirect must include `cache-control: no-store`.
- `/api/session`, `/api/oauth/status`, and `/api/admin/sheets/maintain` UI fetches must include same-origin credentials.
- `src/services/sheetsClient.ts` must include same-origin credentials.

Validation run in this artifact:
- npm run typecheck: passed
- npm run validate:all: passed
- npm run build: passed

Not claimed:
- Deployed Cloudflare browser OAuth success after upload
- Live Google Sheets maintenance execution after upload
- Live provider smoke tests

Those require pushing this artifact and reconnecting Gmail on `https://network.joinwestpeek.com` after Cloudflare deploy finishes.
