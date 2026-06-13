<!-- ARCHIVED: superseded by active runbooks / ledgers. See docs/archive/ARCHIVE_INDEX.md and docs/DOCS_CONSOLIDATION_MAP.md. -->

# Security Model

## Network OS

Network OS must use approved-user login and server-side auth enforcement in production.

Initial approved users:

- `sequoia@westpeek.ventures`
- `scooter@westpeek.ventures`

Every production API route must enforce authenticated session, approved email allowlist, role permission, and resource ownership where applicable.

## Team page

`joinwestpeek.com/team` uses a simple shared password gate: `stored in owner password manager`. Anything behind the Team page can be used by any user with that password.

## Secrets

Real plaintext secrets are not committed. Local/operator secrets are stored in encrypted `secrets/network-os.local.env.gpg`. Production secrets live in Cloudflare.


## Current Pitch Lab contract update

Pitch Lab now sends two signed payloads:

1. `founder_profile_lead` at the profile gate. This auto-writes a Network OS profile/intake event and contains no pitch answers.
2. `founder_story_packet` after explicit share consent. This appends/enriches Network OS with the packet for network review and relationship routing.

Deprecated Pitch Lab payloads using `capture_type: pitch_practice`, `trigger_intent: deal_flow`, or `pitch_story_card` are rejected unless a future documented compatibility mode is added. No email notification is required in this build; Network OS is the source of truth.
