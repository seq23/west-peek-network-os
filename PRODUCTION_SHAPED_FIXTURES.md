# Production-Shaped Fixtures

Status: ACTIVE

Synthetic fixtures must cover: nested Gmail HTML, forwarded threads, quoted replies, entities, tracking pixels, malformed encoding, 20k+ bodies, no-whitespace tokens, serialized arrays/objects, OCR empty/low-confidence output, voice transcripts, provider failures, duplicate intake, missing identity fields, Unicode, invalid timestamps, archived/latest-version rows, signed/stale/replayed Pitch Lab packets, and mixed legitimate/Tier 4 records.

Fixtures live under `tests/fixtures/production-shaped/`. No real customer data, credentials, or confidential deal content may be committed.

Each fixture must identify consuming route, expected display summary, source-detail availability, lifecycle expectation, and cleanup policy.
