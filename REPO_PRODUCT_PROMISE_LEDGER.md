# Product Promise Ledger — West Peek Network OS

Status: ACTIVE  
Date: 2026-06-11

This ledger is the acceptance ledger for product promises that must not disappear behind generic validation language.

| Promise | Required behavior | Required proof | Completion impact |
|---|---|---|---|
| `#wpnetwork` canonical relationship trigger | A Gmail/self-email note containing `#wpnetwork` creates an Intake Queue row only. It never creates a final contact or sends any communication automatically. | Static trigger validator, domain workflow tests, local Playwright, live Gmail provider proof or explicit UNPROVEN. | COMPLETE blocked if absent from tests/docs. Live provider readiness blocked if Gmail proof unrun. |
| `#addtowestpeek` alias | Alias behaves as a network trigger and creates human-review intake only. | Local Playwright alias lane plus trigger validator. | COMPLETE blocked if absent. |
| `#westpeeknetwork` alias | Alias behaves as a network trigger and creates human-review intake only. | Local Playwright alias lane plus trigger validator. | COMPLETE blocked if absent. |
| `#wpdealflow` canonical deal-flow trigger | Creates founder/prospective deal-flow intake with `trigger_intent=deal_flow`, `person_type=founder`, `deal_flow_prospect=yes`, and deal context preserved. | Trigger validator, domain workflow test, Playwright deal-flow lane, live Gmail proof or explicit UNPROVEN. | COMPLETE blocked if absent. |
| `#dealflow` alias | Alias creates the same founder/prospective deal-flow intake classification. | Playwright alias lane plus trigger validator. | COMPLETE blocked if absent. |
| Human approval guardrail | All trigger-created records preserve `human_review_required=true` and `execution_allowed=false`; no send/order/intro/export happens without approval. | Runtime source check, tests, Playwright, provider docs. | COMPLETE blocked if absent. |
| Review lifecycle | Intake can be converted, attached, dismissed, or marked needs-more-info; conversion preserves founder/deal-flow tags. | Domain workflow tests and local Playwright. | COMPLETE blocked if untested. |
| Live Gmail ingestion | Real Gmail OAuth/search/trigger ingestion writes the same rows to Google Sheets. | Operator-run live provider proof with Gmail + Sheets evidence. | Production readiness blocked until PASS. |

## 2026-06-11 Provider Proof Correction

Gmail trigger ingestion promise is implemented through `/api/gmail/sync` and remains incomplete until real provider proof runs against deployed Google OAuth/Gmail/Sheets with operator-seeded messages.

Pitch Lab promise is implemented through signed endpoints using `x-pitch-lab-submitted-at` and `x-pitch-lab-signature` with base64url HMAC over `${submittedAt}.${rawBody}`. Tests must use this exact contract.

No provider-backed lane may be called complete from static validation, mocked E2E, or pre-existing evidence lookup.
