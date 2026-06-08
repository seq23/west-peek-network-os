# Hostile Playwright Max-Depth Review

## Layers

### Layer A: Mocked max-depth UI E2E

Purpose: cover every app journey without burning provider quota.

Covered:

- Every left-sidebar route as its own route test
- Dashboard action routing
- Manual add
- Duplicate guard
- Relationship touch creation
- Vendor handoff
- Approval approve and reject
- Notification read
- Canonical Gmail intake conversion
- Trigger aliases
- Intake attach
- Intake dismiss
- Event creation
- Event private context
- Capture Studio image OCR route
- Capture Studio voice route
- Thank-you drafting
- AI Smoke Test UI and pending human-review suggestion
- Settings refresh connection status
- Settings refresh from Google Sheets
- Settings sheet maintenance
- Instructions triggers and guardrails
- Mobile primary actions
- Mobile full sidebar route coverage

### Layer B: Live production smoke

Purpose: check the deployed shell and auth/sheets endpoints without mocks.

Covered:

- Production shell renders current sidebar
- Production Settings surface renders
- `/api/oauth/status` returns controlled JSON and does not expose raw Google quota crash text
- `/api/admin/sheets/maintain` is either auth-gated or succeeds cleanly and does not expose raw Google quota crash text

## Explicit limitation

The mocked suite proves frontend journey behavior when API contracts behave. The live suite checks deployed shell and endpoint failure shape. A real OAuth reconnect must still be manually verified in the browser because it depends on Google account consent, browser cookie persistence, and production redirect behavior.
