# Pitch Lab Profile Lead Capture Contract

Pitch Lab sends a signed `founder_profile_lead` payload when a founder completes the profile gate. Network OS writes that submission to the **Intake Queue only**. It contains name, email, company, and optional website. Pitch answers remain private until the founder explicitly shares a Founder Story Packet.

## Locked routing behavior

- `source = pitch_lab`
- `capture_type = founder_profile_lead`
- `trigger_intent = relationship_routing`
- `person_type = founder`
- `deal_flow_prospect = yes` by default
- `relationship_owner = Unassigned` by default
- `review_status = pending_network_review`
- `human_review_required = true`
- `execution_allowed = false`
- `database_write_status = queued_for_network_review`

Pitch Lab submissions do **not** create or update a row in `contacts`. An authenticated Network OS operator reviews the intake, may change deal-flow prospect status and assignment, and then explicitly chooses **Add to West Peek Network** or **Attach to Existing Person**.

No email notification is required in this build; Network OS is the source of truth.
