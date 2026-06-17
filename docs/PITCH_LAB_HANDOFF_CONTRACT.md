# Pitch Lab → Network OS Handoff Contract

Pitch Lab does not become a CRM. Network OS remains the relationship intelligence system, and the Intake Queue is the mandatory boundary before a founder becomes a finalized Network contact.

## Endpoints

- `POST /api/intake/pitch-lab-profile`
- `POST /api/intake/pitch-lab`

## Security

- Requires `x-pitch-lab-signature`.
- Requires `x-pitch-lab-submitted-at`.
- Signature is HMAC-SHA256 over `${submittedAt}.${rawBody}` using `PITCH_LAB_SHARED_SECRET`.
- Missing, stale, bad-signature, or consentless payloads are rejected.

## Current payloads

1. `founder_profile_lead` at the profile gate. Contains only founder identity fields and no pitch answers.
2. `founder_story_packet` after explicit share consent. Contains the founder packet for relationship and deal-flow review.

## Server-side defaults

Both payloads create a pending Intake Queue record only:

- `source = pitch_lab`
- `trigger_intent = relationship_routing`
- `person_type = founder`
- `deal_flow_prospect = yes`
- `parsed_owner = Unassigned`
- `human_review_required = true`
- `execution_allowed = false`
- `review_status = pending_network_review`
- `database_write_status = queued_for_network_review`

## Operator decision boundary

The Intake Queue card exposes deal-flow prospect and relationship-owner controls. A founder enters `contacts` only after an authenticated operator chooses **Add to West Peek Network**. Existing people may instead be attached through **Attach to Existing Person**.

## Forbidden

- automatic contact creation or update
- bypassing the Intake Queue
- auto-touch creation
- auto-intro or outbound communication
- funding, review, meeting, or follow-up guarantees
- unsigned public intake
- fake success without Google Sheets persistence

Deprecated payloads using `capture_type: pitch_practice`, `trigger_intent: deal_flow`, or `pitch_story_card` remain rejected. No email notification is required in this build; Network OS is the source of truth.
