<!-- GENERATED_BY=generic-testing-architecture-capability-installer -->
# Proof Fixture Standard

Every durable proof record must carry a unique `proof_run_id`, `proof_test_id`,
`proof_fixture=true`, creation timestamp, cleanup policy, and expiry. Cleanup must
operate only on exact registered identifiers and must run in `finally` semantics.
A proof run cannot pass while cleanup remains incomplete.

This scaffold does not implement application-specific adapters or deletion rules.
