# Pitch Lab → Network OS Handoff Contract

Phase 7 adds one narrow bridge from West Peek Pitch Lab to Network OS.

## Rule

Pitch Lab does not become a CRM. Network OS remains the CRM and relationship intelligence system.

## Endpoint

`POST /api/intake/pitch-lab`

## Security

- Requires `x-pitch-lab-signature`.
- Requires `x-pitch-lab-submitted-at`.
- Signature is HMAC-SHA256 over `${submittedAt}.${rawBody}` using `PITCH_LAB_SHARED_SECRET`.
- Missing or bad signature is rejected.
- Consentless payload is rejected.

## Server-side defaults

Network OS creates a pending intake only:

- `source = pitch_lab`
- `capture_type = pitch_practice`
- `person_type = founder`
- `trigger_intent = deal_flow`
- `deal_flow_prospect = unknown`
- `human_review_required = true`
- `execution_allowed = false`
- `review_status = pending_human_review`

## Forbidden

- automatic contact creation
- auto-touch creation
- auto-intro
- funding/review/meeting guarantee
- unsigned public intake
- fake success without Google Sheets persistence
