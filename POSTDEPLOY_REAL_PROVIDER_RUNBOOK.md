# West Peek Network OS — Postdeploy Real Provider Runbook

Status: ACTIVE  
Updated: 2026-06-11

## Required inputs

- Fresh deployment URL
- Commit SHA
- `WEST_PEEK_E2E_RUN_ID`
- Connected Google OAuth account
- Cloudflare secrets synced
- Safe test event slug
- Local access to provider secrets without printing them

## Gmail operator seed messages

Send fresh messages to the connected Gmail account. Each message body must include the run ID.

Required seed set:

1. `#wpnetwork` relationship capture
2. `#addtowestpeek` alias capture
3. `#westpeeknetwork` alias capture
4. `#wpdealflow` founder/deal-flow capture
5. `#dealflow` short alias founder capture

Then run the real Gmail test from `TESTING_SEQUENCE.md`.

## Evidence record

For each provider lane, record:

- run ID
- deployment URL
- provider/account used, without secrets
- command/manual action
- created row IDs
- readback source
- expected guardrails
- result

Use `LIVE_PROVIDER_EVIDENCE_TEMPLATE.md`.

## Fast authenticated-state restoration

Before Tier 4 or authenticated Hallmark evidence collection:

- `npm run auth:restore`
- `npm run auth:status`

Then use:

- `npm run tier4:authenticated`
- `npm run hallmark:authenticated`

After a newly authenticated state is created or refreshed, run `npm run auth:backup` so the external encrypted canonical vault survives future snapshot updates.
