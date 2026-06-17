# Phase 9C — Network OS Handoff Review / Data Trace

## Scope

Repo: `west-peek-network-os-main`

Phase 9C reviews the Network OS receiver side of the Pitch Lab handoff. It does not redesign Pitch Lab, add email, add a new CRM, add scoring, add a matching engine, or create automatic actions.

## Current handoff shape

Pitch Lab sends a server-to-server signed request to:

`POST /api/intake/pitch-lab`

Network OS validates the request, maps it to an `intake_queue` row, and returns only pending-review status.

## Data trace

1. Pitch Lab founder completes a Pitch Story Card.
2. Founder explicitly consents to share with West Peek.
3. Pitch Lab server signs the raw JSON body with `PITCH_LAB_SHARED_SECRET`.
4. Network OS receives request at `/api/intake/pitch-lab`.
5. Network OS rejects missing/weak secret configuration.
6. Network OS rejects missing signature/timestamp.
7. Network OS rejects invalid signature.
8. Network OS rejects stale/future timestamps outside the replay window.
9. Network OS optionally rejects mismatched browser `Origin` when an origin header exists and `PITCH_LAB_ALLOWED_ORIGIN` is configured.
10. Network OS validates payload source, capture type, consent, founder identity, and Pitch Story Card fields.
11. Network OS overwrites sensitive routing/status fields server-side.
12. Network OS appends a single `intake_queue` row.
13. Network OS returns `{ ok: true, intake_id: "...", profile_id: "", review_status: "pending_network_review", database_write_status: "queued_for_network_review", profile_created: false, contact_created: false, human_review_required: true, execution_allowed: false }` only after the Intake Queue append and readback succeed.
14. A human reviewer decides later whether to convert, attach, dismiss, or request more info.

## Hostile review verdict

The receiver is intentionally narrow:

- one endpoint
- one payload validator
- one mapping function
- one pending intake row
- no contact creation
- no automatic execution
- no founder scoring
- no new Pitch Lab CRM concepts

This is the efficient implementation. The Network OS should remain the system of record and review queue, not become a second Pitch Lab product.

## Hard-fail receiver rules

- Unsigned request accepted.
- Bad signature accepted.
- Missing consent accepted.
- Unsupported source/capture type accepted.
- Stale replay request accepted.
- `execution_allowed: true` from client preserved.
- `human_review_required: false` from client preserved.
- Intake created as anything other than `pending_network_review`.
- Contact created automatically.
- Success returned without persistence.
- Raw shared secret logged or exposed.

## Warning-only items

- Missing optional website.
- Vague traction/proof language.
- No duplicate detection in Phase 9C.
- No live Google Sheets proof without credentials.
- No deployed Cloudflare proof without deployment.

## Common-sense UX / reviewer trace

A reviewer should see a normal pending intake item with:

- founder name
- founder email
- company
- website if provided
- one-line pitch
- company summary/context
- problem/solution/proof/founder edge/why now
- consent evidence in parsed notes
- internal data trace showing consent/signature/human-review gate

The reviewer should not be forced through a special Pitch Lab dashboard. Existing intake review controls should remain enough for this version.

## 9C decision

No additional Network OS product surface is needed now. Keep the receiver boring, signed, and pending-review-only.


## Current Pitch Lab contract update

Pitch Lab now sends two signed payloads:

1. `founder_profile_lead` at the profile gate. This writes a Network OS Intake Queue record only and contains no pitch answers.
2. `founder_story_packet` after explicit share consent. This appends a packet record to the Intake Queue for network review and relationship routing; it does not create or update a contact.

Deprecated Pitch Lab payloads using `capture_type: pitch_practice`, `trigger_intent: deal_flow`, or `pitch_story_card` are rejected unless a future documented compatibility mode is added. No email notification is required in this build; Network OS is the source of truth.
