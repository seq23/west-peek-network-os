# Pitch Lab Profile Lead Capture Contract

Pitch Lab sends a signed `founder_profile_lead` payload when a founder completes the profile gate. This creates or links a Network OS profile and appends an intake event. It contains only name, email, company, and optional website. Pitch answers remain private until the founder explicitly shares a Founder Story Packet.

No approval gate blocks persistence. Human review applies only to later actions/routing.

## Locked current routing language

Payloads use `trigger_intent: relationship_routing`. No approval gate blocks database persistence. No email notification is required in this build; Network OS is the source of truth.
