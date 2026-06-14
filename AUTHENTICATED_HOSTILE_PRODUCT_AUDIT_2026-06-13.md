# Authenticated Hostile Product Audit — 2026-06-13

## Source of truth
- Repository snapshot: commit `0ccbb55`
- Hallmark evidence reviewed: `west-peek-network-os-hallmark-final-2026-06-13.zip`
- Hallmark capture scope: authenticated home route at desktop, tablet, and mobile; it did not capture every operator route.
- Production error supplied by operator: `UNKNOWN_MAINTENANCE_FAILURE` from Sheet maintenance.

## Critical findings and corrections

### 1. Operator lifecycle controls were incomplete
**Severity:** Critical

Contacts and events had archive/revoke controls, but attendees, relationship touches, approval history, notifications, and AI suggestions lacked a complete operator-controlled archive/dismiss lifecycle. This left records trapped in active interfaces and forced spreadsheet intervention.

**Correction:** Added authenticated append-only lifecycle endpoint at `/api/records/lifecycle` with strict entity/action allowlists. Added archive/restore or dismiss/restore controls to event attendees, touches, approvals, notifications, and AI suggestions.

### 2. Approval and notification mutations destroyed display context
**Severity:** High

The approval decision and notification read routes wrote synthetic replacement rows rather than copying the latest record. The latest-by-ID snapshot could therefore replace the original payload or notification subject with generic audit text.

**Correction:** Both routes now read the current latest record and append a merged lifecycle version, preserving all original fields.

### 3. Sheet maintenance exceeded Cloudflare subrequest budget
**Severity:** Critical

Maintenance wrote each normalized cell with an individual Google Sheets request. Dirty sheets could exceed the Worker subrequest ceiling and return `UNKNOWN_MAINTENANCE_FAILURE` before completion.

**Correction:** Normalization writes now use one Google Sheets `values:batchUpdate` request per tab. Added explicit `NORMALIZATION_BATCH_WRITE_FAILED` and `WORKER_SUBREQUEST_LIMIT` classifications.

### 4. HTML-like provider content polluted operator UI
**Severity:** High

Provider/user text was rendered as literal HTML markup in dashboard cards and record surfaces. React prevented script execution, but the interface displayed raw tags/entities and long unbroken content.

**Correction:** Added centralized `displayText` / `clippedText` normalization. Dashboard, contact, intake, touch, approval, notification, event-attendee, and AI-suggestion surfaces now strip tags, decode common entities, normalize whitespace, truncate intentionally, and wrap hostile long strings.

### 5. AI suggestions had no operator review inventory
**Severity:** High

The UI exposed an AI Helper button but did not surface persisted `ai_suggestions` rows for review or dismissal.

**Correction:** Added AI suggestions to the live Sheet snapshot model and rendered pending suggestions with a dismiss lifecycle action.

## Route/control inventory

| Surface | Control | API | Persistence model | Result after correction |
|---|---|---|---|---|
| Contacts | Archive / Restore | `/api/contacts/status` | append-only latest version | preserved |
| Intake | Convert / Attach / Dismiss | `/api/intake/review` | append-only latest version | preserved |
| Touchpoints | Archive / Restore | `/api/records/lifecycle` | append-only latest version | added |
| Approvals | Approve / Reject | `/api/approvals/decision` | append-only merged latest version | corrected |
| Approval history | Archive / Restore | `/api/records/lifecycle` | append-only latest version | added |
| Notifications | Mark read | `/api/notifications/read` | append-only merged latest version | corrected |
| Notifications | Dismiss / Restore | `/api/records/lifecycle` | append-only latest version | added |
| Events | Revoke / Restore | `/api/events/status` | append-only latest version | preserved |
| Event attendees | Archive | `/api/records/lifecycle` | append-only latest version | added |
| AI suggestions | Dismiss | `/api/records/lifecycle` | append-only latest version | added |
| Settings | Sheet maintenance | `/api/admin/sheets/maintain` | batched Google Sheets writes | corrected structurally |
| Settings | Gmail sync | `/api/gmail/sync` | provider read + append-only intake | unchanged |
| Settings | Tier 4 cleanup | `/api/proof-fixtures/cleanup` | bounded append-only cleanup | unchanged |

## Evidence status

- **Visually inspected:** Home route only, across desktop/tablet/mobile Hallmark screenshots. Other route layouts were source-reviewed, not browser-captured.
- **Network verified:** Existing Hallmark pack verified authenticated home route load only. New lifecycle and maintenance changes are not deployed yet.
- **Persistence verified:** Existing production cleanup proof was previously verified. New archive/restore controls and batched maintenance are not live-persistence verified yet.
- **Unproven:** deployed route-by-route authenticated clicks, post-mutation fresh readback, mobile behavior on every corrected page, Cloudflare behavior of batched maintenance, and production Google Sheets lifecycle writes from the new controls.

## Required local proof after applying
1. Deploy and run strict postdeploy proof.
2. Restore authenticated state.
3. Run an authenticated click audit covering every destructive control.
4. For each mutation, force a fresh Sheet snapshot and verify the latest row persisted.
5. Run Sheet maintenance and confirm no subrequest-limit failure.
6. Capture every operator route in final Hallmark evidence.
