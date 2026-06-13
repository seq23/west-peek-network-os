# Provider Failure Handling

Provider errors must be controlled, redacted, and action-safe. Raw `atob()` errors, token snippets, private keys, Anthropic keys, Google access tokens, stack traces, and localhost defaults must not leak in UI or reports.
