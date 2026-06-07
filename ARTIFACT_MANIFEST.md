# Artifact Manifest

Repo: west-peek-network-os
Artifact: full baseline snapshot
Date: 2026-06-07

Included:
- West Peek branded Vite/React app
- Dashboard, Instructions, Manual Add, Intake, Contacts, Touches, Approvals, Notifications, AI Review, Settings
- Locked cumulative build spec docs
- Updated Item #32 encrypted secrets workflow
- Cloudflare secret push script
- Google Sheets setup docs with exact tabs/headers
- Google Sheets runtime persistence helper for Cloudflare Functions
- Runtime API surfaces for intake, contacts, approvals, notifications, trigger check, health, session
- Domain workflows for trigger parsing, intake conversion, duplicate detection, touch creation, approval, notification resolution
- Persistence E2E specs for manual add, intake conversion, reload persistence, duplicate blocking, approval notification resolution
- Hostile code review notes

Excluded:
- node_modules/
- dist/
- .git/
- .env
- .env.local
- coverage/
- playwright-report/
- test-results/

Proof performed before packaging:
- npm ci
- npm run build
- npm run validate:all
- ZIP integrity/reopen/root checks

Not proven in this container:
- Playwright browser E2E, because Chromium browser binary is not installed in the container
- Google Sheets runtime with real credentials
- Gmail API runtime
- Google OAuth runtime
- Claude API runtime
- Handwritten/vendor runtime
- Transactional email runtime
- Cloudflare deployment
