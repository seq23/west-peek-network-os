# West Peek Network OS Testing Architecture

## Canonical layers

- Tier 1: static, structural, security, documentation, artifact, and build contracts.
- Tier 2: domain logic, provider contracts, classifier fixtures, auth exclusion, state and cleanup logic.
- Tier 3A: mocked browser journeys.
- Tier 3B: local full-stack/provider-independent durable journeys.
- Tier 4: live Gmail, Google Sheets, deployed Cloudflare, GitHub Actions, and cross-instance proof.

## Provider modes

Exactly one mode must be explicit:

- `fixture`
- `local-adapter`
- `live-provider`

Fixture and local-adapter modes hard-fail outside local/test runtime.

## Canonical operator commands

- `npm run verify:fast`
- `npm run deep-validation`
- `npm run verify:local`
- `npm run release:prepush`
- `npm run release:postpush`
- `npm run release:live-proof`

## New provider-independent gates

- `npm run test:provider-architecture`
- `npm run test:gauntlet:local`

Deep Validation runs every safe provider-independent lane before handoff. It reports browser/provider/deployment restrictions as environment gaps rather than product failures.

## Browserless mocked web-contract lane

When Chromium is unavailable, `npm run test:web-contracts:mocked` executes the real client request and normalization layer with a strict mocked `fetch` transport. This lane proves request routing, payload serialization, fresh-read metadata, lifecycle mutation payloads, and structured error propagation without external network access.

This lane is LOCAL INTEGRATION proof only. It does not prove DOM rendering, navigation, CSS/layout, browser execution, visual behavior, deployed runtime, or live providers. Playwright and live-provider lanes remain separately required where applicable.
