# West Peek Network OS Master Gauntlet

**Status:** ACTIVE

## Local provider-independent gauntlet

Command:

`npm run test:gauntlet:local`

Proves:

1. Shared-inbox founder inquiry classification and pending Intake creation.
2. Ten simultaneous local writes produce exactly one canonical Intake row.
3. Google Sheets-shaped local maintenance is non-destructive and idempotent.
4. Contact archive/restore persists through fresh readback.
5. Event revoke/restore preserves prior attendee history.
6. Approval and notification resolution persist.
7. Proof fixtures are marked cleaned and no active proof record remains.

The local gauntlet uses a durable isolated file-backed store and production-shaped provider contracts. It does not claim live Gmail, live Google Sheets, Cloudflare isolate concurrency, GitHub Actions, or production deployment proof.

## Browser gauntlet

Existing Playwright Master Gauntlet remains required for operator-facing journeys, loading/error/empty states, mobile behavior, keyboard operation, refresh/re-entry, and truthful UI outcomes.

## Deployed/live gauntlet

Required guarded lanes:

1. Live shared-inbox founder journey.
2. Live Gmail classification matrix.
3. Cross-instance duplicate race.
4. Live Sheets maintenance fixture and second-run idempotency.
5. Deployed auth boundaries and critical mobile journey.
6. Provider/application cleanup verification.

Every live lane requires run-scoped diagnostics, provider evidence, exact fixture registration, cleanup in `finally`, and zero unexplained active fixtures.


## Authenticated Product Usability Addendum — 2026-06-13

This repository adopts `docs/REPO_MASTER_CONTRACT_ADDENDUM_AUTHENTICATED_PRODUCT_USABILITY_2026-06-13.md`. Route-complete authenticated usability, production-shaped rendering, control-to-persistence proof, refresh/re-entry, maintenance scale, post-cleanup audit, and route-complete Hallmark are distinct mandatory proof layers.
