# E2E Required Test Matrix — West Peek Network OS

Status: ACTIVE  
Date: 2026-06-11  
Purpose: repo-owned E2E coverage ledger for the Master Contract / Master Addendum.

## Completion rule

West Peek Network OS cannot be called COMPLETE until every HARD FAIL lane below is either:

1. implemented as an executable E2E/proof lane and passed, or
2. explicitly labeled UNPROVEN with completion impact.

## Matrix

| Required lane | Required file / command | Current repo status | Completion impact |
|---|---|---:|---|
| Capstone product lifecycle gauntlet | `tests/e2e/master-gauntlet.spec.ts`; `npm run test:e2e:master-gauntlet` | PRESENT / NOT RUN | Blocks COMPLETE until run/pass. |
| Public event form submit + invalid states | `tests/e2e/public-event-and-pitchlab.spec.ts` | PRESENT / NOT RUN | Blocks COMPLETE until run/pass locally or postdeploy. |
| Pitch Lab signed packet + invalid/replay denial | `tests/e2e/public-event-and-pitchlab.spec.ts` | PRESENT / NOT RUN | Blocks COMPLETE until run/pass with real deployment secret evidence. |
| `#wpnetwork` browser intake lifecycle | `tests/e2e/master-gauntlet.spec.ts` | PRESENT / NOT RUN | Blocks COMPLETE until run/pass. |
| `#addtowestpeek` alias | `tests/e2e/master-gauntlet.spec.ts` | PRESENT / NOT RUN | Blocks COMPLETE until run/pass. |
| `#westpeeknetwork` alias | `tests/e2e/master-gauntlet.spec.ts` | PRESENT / NOT RUN | Blocks COMPLETE until run/pass. |
| `#wpdealflow` founder/deal-flow classification | `tests/e2e/master-gauntlet.spec.ts` | PRESENT / NOT RUN | Blocks COMPLETE until run/pass. |
| `#dealflow` alias classification | `tests/e2e/master-gauntlet.spec.ts` | PRESENT / NOT RUN | Blocks COMPLETE until run/pass. |
| No automatic contact, email, intro, note, approval, or send from triggers | `tests/e2e/master-gauntlet.spec.ts` | PRESENT / NOT RUN | Blocks COMPLETE until run/pass. |
| Malformed trigger and duplicate trigger behavior | `tests/e2e/provider-failure-auth-mobile-edge.spec.ts` | PRESENT / NOT RUN | Blocks COMPLETE until run/pass. |
| Protected route/session denial | `tests/e2e/provider-failure-auth-mobile-edge.spec.ts` | PRESENT / NOT RUN | Blocks COMPLETE until run/pass. |
| Provider failure UI for Gmail, Sheets, Claude, OCR, voice | `tests/e2e/provider-failure-auth-mobile-edge.spec.ts` | PRESENT / NOT RUN | Blocks COMPLETE until run/pass. |
| Mobile critical workflows | `tests/e2e/provider-failure-auth-mobile-edge.spec.ts` | PRESENT / NOT RUN | Blocks COMPLETE until run/pass. |
| Live Gmail trigger ingestion | `tests/e2e/live-gmail-trigger-ingestion.spec.ts`; `npm run test:e2e:live-gmail` | PRESENT AS LIVE PROOF LANE / UNPROVEN | Blocks COMPLETE until run with real Gmail/OAuth/Sheets. |
| Postdeploy critical runtime smoke | `tests/e2e/network-os.live.spec.ts`; `npm run test:e2e:live` | PRESENT / UNPROVEN | Blocks production-readiness claim until run. |
| Headed visual gauntlet | `npm run test:e2e:local-headed` | PRESENT AS COMMAND / UNPROVEN | Requires local human-visible run for visual trust. |
| E2E coverage static guard | `npm run validate:e2e-coverage` | PRESENT | Does not prove browser behavior. |

## Explicit UNPROVEN lanes until evidence exists

- LIVE GMAIL TRIGGER INGESTION
- GOOGLE SHEETS LIVE READ/WRITE
- PITCH LAB DEPLOYED SECRET PARITY
- CLOUDFLARE ENV PARITY
- POSTDEPLOY FULL JOURNEY
- HEADED VISUAL HUMAN REVIEW
