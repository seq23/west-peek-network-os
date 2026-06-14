# Gmail Seed Message Guide

Status: CANONICAL TIER 4 INPUT GUIDE

The production application intentionally uses Gmail read-only scope. Tier 4 supports two explicit seeding modes.

## Mode A — Manual seed (default and least privilege)

Set `TIER4_GMAIL_SEED_MODE=manual`. No Gmail send token is required.

Choose one run ID matching `wpno-tier4-*`. Send exactly five separate messages to the connected mailbox, one for each alias. Each message must contain the same run ID and exactly one canonical alias.

Required subject pattern:

`WP Network Tier 4 <RUN_ID> <ALIAS>`

Required body pattern:

```text
<ALIAS>
WEST_PEEK_E2E_RUN_ID=<RUN_ID>
Name: Tier 4 <RUN_ID> <ALIAS>
Email: <RUN_ID>-<ALIAS_WITHOUT_HASH>@example.com
Company: Tier 4 Proof
Context: <RUN_ID>-<ALIAS_WITHOUT_HASH>
```

Create one message for each alias:

- `#wpnetwork`
- `#addtowestpeek`
- `#westpeeknetwork`
- `#wpdealflow`
- `#dealflow`

Do not put multiple aliases in the same manual proof message. The separate hostile suite covers multi-alias determinism.

Run the proof with the exact same `WEST_PEEK_E2E_RUN_ID`. The live test queries Gmail by run ID, proves exactly one row per alias, verifies classification, pending human review, exact Sheet readback, second-run dedupe, exact cleanup, unrelated-row preservation, and unchanged schema fingerprints.

## Mode B — API seed (optional automation)

Set `TIER4_GMAIL_SEED_MODE=api` and provide:

- `TIER4_GMAIL_SEED_ACCESS_TOKEN` with temporary `gmail.send` scope
- `TIER4_GMAIL_SEED_TO` equal to the connected mailbox

This token is used only by the proof runner to create the five messages. It does not expand the production application's read-only Gmail scope.

## Hard boundary

The test must fail when the selected mode lacks its required inputs. A missing API token must not block manual mode. Manual mode must not claim that the test created the messages itself.
