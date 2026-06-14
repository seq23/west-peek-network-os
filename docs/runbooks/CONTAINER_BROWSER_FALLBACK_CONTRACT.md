# Container Browser Fallback Contract

**Status:** LOCKED / AUTHORITATIVE

## Purpose
When Chromium or another supported browser cannot be executed in the assistant container, the release process must not attempt repeated browser installation or pretend browser proof occurred. The mandatory fallback is deterministic snapshot and screenshot-oriented validation.

## Detection Rule
Run `npm run test:environment-doctor` once.

If it classifies the browser lane as unavailable, blocked, or non-runnable:

1. Do not repeatedly install Chromium.
2. Do not weaken or skip browser assertions silently.
3. Run `npm run validate:container-snapshot-fallback`.
4. Preserve any available route snapshots, DOM/render snapshots, contract snapshots, static screenshot evidence, and prior approved reference screenshots.
5. Label browser execution as `LOCAL BROWSER VALIDATION REQUIRED`.

## Mandatory Fallback Bundle
The fallback must run:

1. TypeScript typecheck.
2. Production build.
3. Route-manifest validation.
4. Authenticated-usability contract validation.
5. Display-normalization tests.
6. Critical UI/data-flow tests.
7. AI Helper approval-flow tests.
8. Playwright max-depth static coverage validation.
9. Baseline packaging contract validation.
10. Snapshot evidence inventory and screenshot-evidence inventory.

## Screenshot Rule
Screenshots are the visual-review workaround when live browser execution cannot run in the container. The fallback must:

- inventory existing approved screenshots and route evidence;
- require screenshot capture during the first local updater/browser run;
- never claim new screenshots were generated when no browser renderer executed;
- carry forward only evidence tied to the current source or explicitly label older screenshots as reference-only.

## Status Rule
A snapshot-fallback pass may support:

`STRUCTURALLY CHECKED — LOCAL BROWSER VALIDATION REQUIRED`

It may not support `COMPLETE` or `UPDATER READY — FULLY VALIDATED` by itself.

## Local Closure
The local updater environment must run the exact repo-owned `release:prepush` browser suite. That run is the authority for browser screenshots, route navigation, CSS/layout, focus, overlap, and responsive proof.
