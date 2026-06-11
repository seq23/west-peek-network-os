<!-- ARCHIVED: superseded by active runbooks / ledgers. See docs/archive/ARCHIVE_INDEX.md and docs/DOCS_CONSOLIDATION_MAP.md. -->

# Event Capture Mode — Hostile-Reviewed Scope

## Purpose

Event Capture Mode is a thin layer over the existing Intake Queue. It is not a separate CRM.

Scooter can create an event such as `Tech Week`, `Pre-Seed Summit`, or `GP Wine Night`, copy a public form link, and let people enter their own details. Operators can then add private context, voice/card/screenshot enrichment, thank-you cards, and follow-up touchpoints through the existing review system.

## Clean architecture

- `events` stores the event wrapper.
- `event_attendees` stores self-submitted attendee rows and operator-added event context.
- `intake_queue` remains the central review queue.
- `relationship_touches` remains the follow-up/touchpoint system.

No public submission creates a final contact automatically.

## Public form route

`/e/:slug`

Public form fields:

- name
- email
- company
- title
- phone
- LinkedIn
- what West Peek should know
- follow-up consent

Security/abuse controls in this pass:

- event must exist
- event must be active
- public form must be enabled
- honeypot field blocks simple bots without surfacing an error
- name/email/consent required
- basic email validation
- text length caps
- no public audio upload
- no public file upload
- no admin or spreadsheet links on public pages

## Internal dashboard

The internal Events page supports:

- create event
- copy public form link
- open public form
- review attendees tied to an event
- add private context to an event attendee
- route private context into Intake Queue
- tie Capture Studio uploads to an event

## Existing systems reused

- Capture Studio handles internal card/screenshot OCR and voice transcription.
- Thank-You Card Studio handles thank-you touch drafts.
- Intake Review handles convert, attach, dismiss.
- Google Sheets snapshot handles spreadsheet → app refresh.

## Guardrails

- Event attendee submissions are pending human review.
- Operator context is pending human review.
- Card/screenshot/voice uploads are pending human review.
- Nothing is sent automatically.
- Nothing is added to Contacts automatically.
- Nothing is merged automatically.
