# Maintenance Scale and Platform Limits

Status: ACTIVE

The Sheets maintenance path must process one tab per request with bounded batches, idempotent resume behavior, no-progress abort, fresh readback, and classified failure diagnostics.

Required proof cases: zero work; one dirty cell; production-shaped workbook; maximum admitted batch; partial failure; retry; resumed run; stale readback; no-progress; subrequest-limit simulation; final remaining dirty count.

Every run reports rows scanned, cells changed, batches, estimated/actual subrequests, failure operation, retryability, run ID, and remaining dirty count. Per-cell remote writes are forbidden where a batch API exists.
