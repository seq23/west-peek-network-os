<!-- GENERATED_BY=generic-testing-architecture-capability-installer -->
# Diagnostics Standard

Tier 3 failures and every Tier 4 run must emit a run-scoped evidence bundle under:

`artifacts/diagnostics/<run_id>/<test_id>/`

Required where applicable:

- `summary.json`
- `runtime-context.json`
- `request-metadata.json`
- `response-metadata.json`
- `console.log`
- `network.json`
- `persistence-readback.json`
- `provider-evidence.json`
- screenshots
- Playwright trace
- cleanup report

Every summary must identify the run ID, test ID, proof layer, environment, base URL, provider mode, persona, expected outcome, actual outcome, final URL, persistence/readback result, cleanup result, failure category, retryability, secret-redaction status, and completion impact.

Diagnostics must never contain plaintext secrets, raw tokens, cookies, unnecessary PII, or private provider payloads.
