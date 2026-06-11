<!-- ARCHIVED: superseded by active runbooks / ledgers. See docs/archive/ARCHIVE_INDEX.md and docs/DOCS_CONSOLIDATION_MAP.md. -->

# Network Database Intake Model

Status: CURRENT — 2026-06-10

## Locked Rule

Network OS is the database of record. Any person who submits their own information through Pitch Lab, West Peek event forms, founder/community forms, or future join-network/referral forms must be automatically saved or updated in the Network OS database.

Approval gates downstream action only. Approval must not gate intake persistence.

## Storage Model

Every self-submitted intake produces two database-backed effects:

1. Profile/person upsert by email in `contacts`.
2. Intake event append in `intake_queue` linked to that profile where possible.

If the email is new, Network OS creates a profile row.

If the email already exists, Network OS appends an updated profile row with the same `contact_id` so latest-row readers can see new metadata while retaining append-only recovery.

## Current Capture Types

- `founder_profile_lead`
- `founder_story_packet`
- `event_registration`
- `event_interest`
- `network_profile_self_submission`

## Current Trigger Intents

- `relationship_routing`
- `event_participation`
- `network_membership`

## Current Review Statuses

- `lead_captured`
- `pending_network_review`
- `profile_updated`
- `event_intake_received`
- `archived`

## Current Database Write Statuses

- `stored`
- `created_new_profile`
- `updated_existing`
- `linked_to_existing_profile`
- `failed`

## Explicit Non-Actions

Intake persistence does not mean:

- outreach was sent;
- a contact was converted for CRM/outreach action;
- an intro was made;
- an invitation was sent;
- a follow-up is guaranteed;
- an investment review occurred;
- an operator routed or approved anything.

Those actions require separate future operator workflows and human review.
