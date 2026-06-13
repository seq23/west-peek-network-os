# Gmail Seed Message Guide

Because the Gmail scope is read-only, Tier 4 requires operator-seeded messages.

Each message must include:

```text
WEST_PEEK_E2E_RUN_ID=<run id>
```

Use one or more supported triggers:

- `#wpnetwork`
- `#addtowestpeek`
- `#westpeeknetwork`
- `#wpdealflow`
- `#dealflow`

The Gmail lane must prove import, stored `gmail_message_id`, duplicate skip, human-review status, and no auto-execution.
