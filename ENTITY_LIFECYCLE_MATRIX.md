# Entity Lifecycle Matrix

Status: ACTIVE

| Entity | Create source | Active/pending | Archive/terminal | Restore | Persistence model | Permission owner |
| --- | --- | --- | --- | --- | --- | --- |
| contacts | manual/intake conversion/event profile | active | archived | restore active | append/update status | operator |
| intake_queue | Gmail/manual/OCR/voice/event/Pitch Lab | pending_human_review | converted/attached/dismissed | No generic restore after terminal review; archive contract applies to nonterminal records | append-only review/lifecycle | operator |
| relationship_touches | contact/thank-you/workflow | pending/approved/fulfillment | cancelled | restore prior active state | append-only status version | operator |
| approvals | workflow/provider | pending | approved/rejected/cancelled | restore archived history only | append-only status version | operator |
| notifications | workflow/provider | unread/read | dismissed | restore prior status | append-only status version | operator |
| ai_suggestions | AI provider | pending | dismissed | restore pending only when safe | append-only status version | operator |
| events | operator | active | closed | reopen only through documented event action | update/append per event contract | operator |
| event_attendees | public/operator event intake | pending/reviewed | archived | restore prior review state | append-only lifecycle | operator |
| provider_replay_guard | signed handoff provider | immutable guard | expired/cleaned proof row | not applicable | immutable/audited cleanup | system |

Hard delete is forbidden unless a repo-local contract explicitly authorizes it. Every mutation requires fresh readback and refresh/re-entry proof.

## Intake Persistence Boundary

Approval must not gate intake persistence. Intake records are captured first; approval gates downstream action only, including outreach, conversion into the Network, assignment, and other execution.

Pitch Lab founder submissions therefore remain pending in `intake_queue` until an operator explicitly converts them. Public event registration may create or link the event profile required by the event contract, but it still does not authorize outreach or other downstream execution.
