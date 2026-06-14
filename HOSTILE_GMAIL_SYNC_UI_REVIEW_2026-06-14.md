# Hostile Gmail Sync UI Review — 2026-06-14

## Scope

Reviewed the shared Gmail sync control, `/api/gmail/sync`, Dashboard, Intake Queue, Settings, automatic Sheets refresh, and narrow post-cleanup integrity behavior.

## Findings repaired

1. **Endpoint mailbox selection was not server allowlisted.** An authenticated caller could request any mailbox represented by an active token row. The endpoint now rejects any mailbox outside the three approved identities with `MAILBOX_NOT_APPROVED`.
2. **Double-click race.** React state alone could allow two handlers before the disabled state rendered. A synchronous `useRef` lock now prevents a second batch.
3. **One fetch exception aborted the whole batch without a useful result.** Each mailbox is now isolated; failures are reported and remaining approved mailboxes continue.
4. **Malformed/non-JSON errors were weakly diagnosed.** They now surface as deterministic HTTP failures.
5. **Server mailbox mismatch was trusted.** The UI now rejects a response that names a mailbox different from the requested mailbox.
6. **Snapshot refresh failure could leave the result stuck or unreported.** Sync totals remain visible and the refresh failure is appended explicitly.

## Proof added

The existing browser suite now proves:

- Settings distinguishes Sheets refresh from Gmail import;
- exactly the three approved mailbox requests are issued sequentially;
- connected/not-connected identities and aggregate counts are shown;
- Dashboard and Intake Queue expose the same shared control;
- malformed and failed mailbox responses do not block a connected mailbox;
- rapid repeat activation launches only one three-mailbox batch.

Static contracts now guard the shared component, three-screen placement, approved mailbox set, server allowlist, automatic refresh, and narrow post-cleanup integrity behavior.

## Unproven boundary

Local mocked browser tests do not prove the three real Gmail OAuth tokens are currently connected or that Gmail/Sheets providers are available. Those remain deployed runtime facts.
