# Sheets and Gmail Trigger Recovery Runbook

## Governing behavior

- Runtime code validates headers and never repairs or reorders them.
- Any mismatch fails closed with `SHEETS_SCHEMA_MISMATCH`.
- Every append requires exact row readback before success is returned.
- Gmail trigger aliases are queried independently and paginated, then deduplicated by Gmail message ID.
- Cleanup defaults to dry run and can delete only exact registered fixtures owned by one proof run.
- Historical text matching and broad physical deletion are prohibited.

## Empty-workbook reset

The authenticated endpoint `POST /api/admin/sheets/reset` requires:

`RESET_EMPTY_WEST_PEEK_NETWORK_WORKBOOK`

It clears the governed tabs, writes canonical headers, freezes row 1, and validates every tab. It is intended only for the currently unused workbook or an explicitly approved destructive reset.

## Read-only doctor

`GET /api/admin/sheets/doctor` validates all governed tabs and performs no mutation.

## Required live proof

For each alias (`#wpnetwork`, `#addtowestpeek`, `#westpeeknetwork`, `#wpdealflow`, `#dealflow`): seed a unique Gmail message, run deployed sync, verify exactly one pending-human-review row under correct headers, rerun sync to prove dedupe, dry-run cleanup, execute using the exact returned IDs, and verify unrelated rows and headers remain unchanged.
