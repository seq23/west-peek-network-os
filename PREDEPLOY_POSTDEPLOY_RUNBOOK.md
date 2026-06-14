# Predeploy / Postdeploy Runbook

## Prepush
Run `npm run release:prepush`. It performs the repo-owned local enforcement gate and blocks commit/push on failure.

## Postpush
Run `npm run release:postpush`. It verifies GitHub Actions for the current commit, then executes declared deployed smoke checks when a base URL is available.

## Live proof
Run `npm run release:live-proof` only with the approved vault lifecycle and explicit production proof intent. Live proof must register and clean every fixture.


## Authenticated Product Usability Addendum — 2026-06-13

This repository adopts `docs/REPO_MASTER_CONTRACT_ADDENDUM_AUTHENTICATED_PRODUCT_USABILITY_2026-06-13.md`. Route-complete authenticated usability, production-shaped rendering, control-to-persistence proof, refresh/re-entry, maintenance scale, post-cleanup audit, and route-complete Hallmark are distinct mandatory proof layers.
