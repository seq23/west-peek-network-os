# Gmail Seed Message Guide

Status: CANONICAL MANUAL INPUT GUIDE

## Current canonical workflow

Use the combined Gmail trigger and forward-only runtime proof documented in:

`docs/runbooks/GMAIL_FORWARD_ONLY_RUNTIME_PROOF.md`

Generate one eight-message packet:

```bash
npm run gmail:forward-only:generate-seeds -- sequoia@westpeek.ventures
```

That single packet covers all five trigger aliases, pagination, forward-only watermarking, cursor persistence, permanent dedupe, Tier 4 rejection, exact cleanup, and no re-import.

Do not run a second manual Gmail seed exercise after the combined proof passes.

## Legacy narrow diagnostic

`test:e2e:live-gmail:real` remains available for historical five-alias diagnostics only. It is not the canonical lifecycle proof and is not required in addition to the combined proof.

## Hard boundary

Production Gmail OAuth remains read-only. Manual seeding requires no Gmail send API token. API seeding may exist as an optional automation lane but is never required for the operator workflow.
