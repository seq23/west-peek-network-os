# Test Fixture Lifecycle

Every durable proof fixture must carry `proof_run_id`, `proof_test_id`, `proof_fixture`, `proof_created_at`, `proof_cleanup_policy`, and `proof_expires_at`.

A run must register exact provider/entity IDs before mutation. Cleanup runs in `finally`, verifies provider and application state, and fails completion when incomplete. Fuzzy-name cleanup is forbidden.

Provider-independent proof uses the durable local Sheets adapter and exact `proof_run_id` ownership. Concurrent writes are serialized, duplicates are refused by stable provider identity, and cleanup marks exact owned records `proof_cleaned`. Live-provider cleanup remains guarded and must query Gmail, Sheets, and application surfaces; a local ledger entry alone is never sufficient live proof.
