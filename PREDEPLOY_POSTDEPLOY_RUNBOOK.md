# Predeploy / Postdeploy Runbook

## Prepush
Run `npm run release:prepush`. It performs the repo-owned local enforcement gate and blocks commit/push on failure.

## Postpush
Run `npm run release:postpush`. It verifies GitHub Actions for the current commit, then executes declared deployed smoke checks when a base URL is available.

## Live proof
Run `npm run release:live-proof` only with the approved vault lifecycle and explicit production proof intent. Live proof must register and clean every fixture.
