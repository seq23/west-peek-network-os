# Postdeploy Runbook — West Peek Network OS

Status: ACTIVE  
Date: 2026-06-11

## Safe smoke

```bash
POSTDEPLOY_BASE_URL="https://network.joinwestpeek.com" npm run postdeploy:smoke
```

This proves deployed shell/API smoke only.

## Full postdeploy with browser E2E

```bash
POSTDEPLOY_BASE_URL="https://network.joinwestpeek.com" npm run validate:everything -- --tier=3 --postdeploy
```

## Trigger provider proof

Manual/live provider proof must include:

- Gmail message with `#wpnetwork`
- Gmail message with `#wpdealflow`
- Gmail message with `#dealflow`
- resulting Google Sheets `intake_queue` rows
- `source_trigger`
- `trigger_intent`
- `person_type`
- `deal_flow_prospect`
- `deal_context`
- `human_review_required=true`
- `execution_allowed=false`

Without that evidence, say: `LIVE GMAIL TRIGGER INGESTION — UNPROVEN`.
