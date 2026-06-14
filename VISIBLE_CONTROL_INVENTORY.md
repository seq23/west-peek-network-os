# Visible Control Inventory

Status: ACTIVE

| Route | Control | Persona | API/Action | Expected state change | Persistence readback | Refresh proof | Failure UX | Test |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Dashboard | Navigate to work queues | Authenticated operator | Client-side navigation | Active route changes only; no durable mutation | Not applicable | Re-entry required | Visible route and active-nav assertion | Authenticated click audit |
| Dashboard | refresh summary | Authenticated operator | UI action → authenticated API | Documented entity state change | Fresh snapshot/API readback required | Required | Classified, no false success | Master Gauntlet / authenticated click audit |
| Events | Create event | Authenticated operator | UI action → authenticated API | Documented entity state change | Fresh snapshot/API readback required | Required | Classified, no false success | Master Gauntlet / authenticated click audit |
| Events | inspect attendee | Authenticated operator | UI action → authenticated API | Documented entity state change | Fresh snapshot/API readback required | Required | Classified, no false success | Master Gauntlet / authenticated click audit |
| Events | archive/restore attendee | Authenticated operator | UI action → authenticated API | Documented entity state change | Fresh snapshot/API readback required | Required | Classified, no false success | Master Gauntlet / authenticated click audit |
| Add Person | Submit contact | Authenticated operator | UI action → authenticated API | Documented entity state change | Fresh snapshot/API readback required | Required | Classified, no false success | Master Gauntlet / authenticated click audit |
| Capture Studio | Upload/capture/save | Authenticated operator | UI action → authenticated API | Documented entity state change | Fresh snapshot/API readback required | Required | Classified, no false success | Master Gauntlet / authenticated click audit |
| Thank-You | Save touch | Authenticated operator | UI action → authenticated API | Documented entity state change | Fresh snapshot/API readback required | Required | Classified, no false success | Master Gauntlet / authenticated click audit |
| Thank-You | choose fulfillment | Authenticated operator | UI action → authenticated API | Documented entity state change | Fresh snapshot/API readback required | Required | Classified, no false success | Master Gauntlet / authenticated click audit |
| Intake Queue | Convert | Authenticated operator | UI action → authenticated API | Documented entity state change | Fresh snapshot/API readback required | Required | Classified, no false success | Master Gauntlet / authenticated click audit |
| Intake Queue | attach | Authenticated operator | UI action → authenticated API | Documented entity state change | Fresh snapshot/API readback required | Required | Classified, no false success | Master Gauntlet / authenticated click audit |
| Intake Queue | dismiss | Authenticated operator | UI action → authenticated API | Documented entity state change | Fresh snapshot/API readback required | Required | Classified, no false success | Master Gauntlet / authenticated click audit |
| West Peek Network | Archive/restore contact | Authenticated operator | UI action → authenticated API | Documented entity state change | Fresh snapshot/API readback required | Required | Classified, no false success | Master Gauntlet / authenticated click audit |
| Touchpoints | Update fulfillment | Authenticated operator | UI action → authenticated API | Documented entity state change | Fresh snapshot/API readback required | Required | Classified, no false success | Master Gauntlet / authenticated click audit |
| Touchpoints | archive/restore | Authenticated operator | UI action → authenticated API | Documented entity state change | Fresh snapshot/API readback required | Required | Classified, no false success | Master Gauntlet / authenticated click audit |
| Approvals | Approve | Authenticated operator | UI action → authenticated API | Documented entity state change | Fresh snapshot/API readback required | Required | Classified, no false success | Master Gauntlet / authenticated click audit |
| Approvals | reject | Authenticated operator | UI action → authenticated API | Documented entity state change | Fresh snapshot/API readback required | Required | Classified, no false success | Master Gauntlet / authenticated click audit |
| Approvals | archive/restore | Authenticated operator | UI action → authenticated API | Documented entity state change | Fresh snapshot/API readback required | Required | Classified, no false success | Master Gauntlet / authenticated click audit |
| Notifications | Mark read | Authenticated operator | UI action → authenticated API | Documented entity state change | Fresh snapshot/API readback required | Required | Classified, no false success | Master Gauntlet / authenticated click audit |
| Notifications | dismiss/restore | Authenticated operator | UI action → authenticated API | Documented entity state change | Fresh snapshot/API readback required | Required | Classified, no false success | Master Gauntlet / authenticated click audit |
| AI Helper | Run smoke | Authenticated operator | UI action → authenticated API | Documented entity state change | Fresh snapshot/API readback required | Required | Classified, no false success | Master Gauntlet / authenticated click audit |
| AI Helper | dismiss suggestion | Authenticated operator | UI action → authenticated API | Documented entity state change | Fresh snapshot/API readback required | Required | Classified, no false success | Master Gauntlet / authenticated click audit |
| App Instructions | Read only | Authenticated operator | Client-side navigation | No durable mutation | Not applicable | Re-entry required | Visible route and active-nav assertion | Authenticated click audit |
| Settings | Refresh | Authenticated operator | `GET /api/sheets/snapshot?fresh=1` | Fresh read-only snapshot replaces stale client state | Fresh authenticated snapshot response required | Required | Classified network/readback failure; no success on stale response | Authenticated click audit |
| Settings | sync | Authenticated operator | UI action → authenticated API | Documented entity state change | Fresh snapshot/API readback required | Required | Classified, no false success | Master Gauntlet / authenticated click audit |
| Settings | maintain | Authenticated operator | UI action → authenticated API | Documented entity state change | Fresh snapshot/API readback required | Required | Classified, no false success | Master Gauntlet / authenticated click audit |
| Settings | cleanup exact run | Authenticated operator | UI action → authenticated API | Documented entity state change | Fresh snapshot/API readback required | Required | Classified, no false success | Master Gauntlet / authenticated click audit |


## Gmail synchronization controls — 2026-06-14

| Surface | Control | Effect | Guardrails |
|---|---|---|---|
| Dashboard → System health | Sync new emails from Gmail | Sequentially checks approved connected Gmail mailboxes, imports qualifying messages, refreshes Intake | Auth required; three-mailbox allowlist; duplicate protection; human review only |
| Intake Queue | Sync new emails from Gmail | Same shared action with immediate queue refresh | Same shared component and endpoint |
| Settings → Gmail intake sync | Sync new emails from Gmail | Same shared action, with full mailbox-policy explanation | Distinct from Refresh from Google Sheets |
| Settings → Google Sheets data | Refresh from Google Sheets | Reloads workbook rows already persisted | Does not query Gmail or create intake rows |
