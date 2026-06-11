# Known Edge Case Inventory — West Peek Network OS

Status: ACTIVE  
Date: 2026-06-11

## Trigger intake

| Edge case | Required behavior | E2E location |
|---|---|---|
| Unknown hashtag without canonical trigger | Do not create intake; show controlled missing-trigger state. | `provider-failure-auth-mobile-edge.spec.ts` |
| `#wpnetwork` with no name/email | Create review-only intake or controlled validation state; no automatic execution. | `provider-failure-auth-mobile-edge.spec.ts` |
| Duplicate email/person | Do not silently duplicate final contact. | `master-gauntlet.spec.ts` |
| Deal-flow alias `#dealflow` | Classify founder + prospective deal flow. | `master-gauntlet.spec.ts` |
| `#wpdealflow` with deck/link context | Preserve deal context; no automatic outreach. | `master-gauntlet.spec.ts` |

## Public and partner intake

| Edge case | Required behavior | E2E location |
|---|---|---|
| Event form missing name/email/consent | Controlled validation, no crash. | `public-event-and-pitchlab.spec.ts` |
| Event form duplicate submit | Review queue / duplicate-safe behavior, no auto-send. | `public-event-and-pitchlab.spec.ts` |
| Pitch Lab invalid signature | 401/403/400 closed failure. | `public-event-and-pitchlab.spec.ts` |
| Pitch Lab replay/missing timestamp | Closed failure or explicit UNPROVEN lane. | `public-event-and-pitchlab.spec.ts` |

## Providers

| Edge case | Required behavior | E2E location |
|---|---|---|
| Gmail OAuth disconnected | Show setup/status, no black screen. | `provider-failure-auth-mobile-edge.spec.ts` |
| Sheets quota/503 | Controlled degraded state, no raw quota/digest error. | `provider-failure-auth-mobile-edge.spec.ts` |
| Claude unavailable | AI suggestion lane stays review-only and no fake success. | `provider-failure-auth-mobile-edge.spec.ts` |
| OCR/voice failure | Human-review intake does not auto-execute. | `provider-failure-auth-mobile-edge.spec.ts` |

## Auth/session

| Edge case | Required behavior | E2E location |
|---|---|---|
| Unauthenticated API call | 401/403/503 controlled JSON, no raw provider crash. | `provider-failure-auth-mobile-edge.spec.ts` |
| Expired/revoked session | Safe denial, no private data. | `provider-failure-auth-mobile-edge.spec.ts` |
