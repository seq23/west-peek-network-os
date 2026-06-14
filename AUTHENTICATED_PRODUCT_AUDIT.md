# Authenticated Product Audit

Status: EXECUTION REQUIRED

Command: `npm run postdeploy:authenticated-click-audit`

The audit restores approved browser state, targets an explicit deployed URL, traverses every route through real navigation, captures desktop/mobile evidence, records console and failed network activity, and writes a route-scoped report. Mutation proof is enabled only with exact registered proof fixtures and must include API response, durable readback, refresh/re-entry, and cleanup.

HTTP-only status checks are not authenticated click-audit proof.

## Hostile verification correction — click-audit proof boundary

The authenticated click-audit command must fail on rejected auth state, incorrect route heading, inactive navigation state, console errors, failed requests, or failed fresh Sheets readback. It proves route-complete visual/navigation coverage and one safe read-only network/readback control. It does **not** prove destructive or reversible lifecycle mutations; those require exact registered proof fixtures and separate per-entity mutation evidence.
