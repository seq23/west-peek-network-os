<!-- ARCHIVED: superseded by active runbooks / ledgers. See docs/archive/ARCHIVE_INDEX.md and docs/DOCS_CONSOLIDATION_MAP.md. -->

# Gmail Trigger Setup

Canonical trigger: `#wpnetwork`

Accepted aliases:

- `#addtowestpeek`
- `#westpeeknetwork`

Every trigger email creates an Intake Queue item first. It does not create a final West Peek Network contact until human review.

Recognized capture situations:

1. Trigger in sent email to contact.
2. Trigger in received email thread.
3. Trigger in forwarded email.
4. Trigger in self-email/internal note.
5. Trigger in reply-to-self after sending an external email.
