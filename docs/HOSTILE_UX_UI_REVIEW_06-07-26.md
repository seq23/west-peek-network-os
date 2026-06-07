# Hostile UX/UI Review — 2026-06-07

## Scope
Reviewed the full Network OS surface after event capture, OCR/audio, thank-you, vendor fulfillment, spreadsheet sync, and flexible intake additions.

## Findings fixed

1. **Brand gap**
   - Problem: dashboard used a synthetic WP text mark instead of the real West Peek logo.
   - Fix: added `/public/wp-logo.jpg` and wired it into the sidebar, thank-you card preview, and public event form shell.

2. **Dashboard clutter / fake-feeling panels**
   - Problem: dashboard mixed real counts with vague provider cards and inflated-sounding AI/Gmail status.
   - Fix: rebuilt dashboard as an operator command center with live status, real counts, open work, capture routes, and honest empty states.

3. **Provider truth gap**
   - Problem: UI could imply configured providers were live-tested.
   - Fix: status panel now separates connected OAuth/live Sheets from provider routes that still require smoke tests.

4. **Local fixture ambiguity**
   - Problem: seeded Mike fixture could feel like real backend data.
   - Fix: Settings now names this as fixture migration, not live data.

5. **Manual add rigidity**
   - Problem: manual add still leaned toward a perfect CRM record.
   - Fix: manual add now accepts name, email, company, or context; missing fields are nonblocking and enrich-later copy is explicit.

6. **Public event form brand mismatch**
   - Problem: public event form did not carry the West Peek mark.
   - Fix: public event shell uses the logo and a tighter West Peek branded visual system.

7. **Navigation overload**
   - Problem: labels were too long and made the app feel heavier than the workflows.
   - Fix: shortened nav labels while preserving all major actions.

## Remaining truths not claimed

- Live Claude Vision OCR success is not proven until deployed provider smoke test.
- Live Google Speech-to-Text success is not proven until deployed audio test.
- Live vendor order/payment is intentionally not implemented.
- Playwright browser runtime was not claimed in this container.

## Final UX principle

The app should feel like an internal operating cockpit: capture fast, review calmly, execute manually where trust matters.
