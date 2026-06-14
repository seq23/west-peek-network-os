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

## 2026-06-11 Real Provider Edge Cases

- Gmail OAuth token exists but access token is expired; sync must refresh with refresh token or return reconnect-required.
- Gmail seed message already imported; sync must skip duplicate `gmail_message_id`.
- Gmail search returns messages without readable text body; sync must not crash.
- Gmail trigger appears in subject only; sync must still detect.
- Gmail trigger has only minimal text; intake row must preserve missing fields for human review.
- Pitch Lab request has valid signature but stale timestamp; reject.
- Pitch Lab request reuses exact signature; reject with replay guard.
- Pitch Lab request uses old `x-west-peek-signature`; reject.
- Pitch Lab profile lead includes pitch answers; reject privacy leak.
- App shell requested without session cookie; redirect to OAuth instead of rendering private Settings.
- Session request includes `x-west-peek-user-email`; production must not authenticate from header.
- Secret scanner sees a committed password/passphrase literal; hard fail.


## Gmail sync UI — 2026-06-14

- Google Sheets refresh does not query Gmail; operators must use **Sync new emails from Gmail**.
- Only `info@westpeek.ventures`, `sequoia@westpeek.ventures`, and `scooter@westpeek.ventures` are eligible.
- Each mailbox requires a separate OAuth connection.
- Partial mailbox failures are reported without aborting other connected mailboxes.
- Rapid repeated activation is locked to one browser-side batch.
- Successful sync followed by snapshot-refresh failure reports both outcomes explicitly.

- Gmail sync provider backlog / Worker subrequest ceiling: one invocation is capped at five messages and one Gmail search page; UI follows `next_page_token` sequentially. Connected provider failures must not render as disconnected mailboxes.

- Gmail sync: Cloudflare-generated non-JSON failure responses must be reported as connected/attempted mailbox sync failures unless the API explicitly returns `MAILBOX_NOT_CONNECTED`.
- Gmail sync: repeated continuation tokens must stop the mailbox loop immediately.
