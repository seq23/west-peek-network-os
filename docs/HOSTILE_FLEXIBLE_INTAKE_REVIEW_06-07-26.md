# Hostile Review — Flexible Intake + Event Capture

Scope reviewed:
- Event Capture Mode and public event form routing.
- Google Sheets sync/snapshot persistence.
- Claude Vision OCR and Google Speech-to-Text capture routes.
- Thank-You Card Studio and relationship touches.
- Gmail `#wpnetwork` structured/minimal/freeform intake.

## Findings

### 1. Structured intake was too narrow
The server-side Gmail intake route accepted `Name`, `Company`, and `Context`, but did not preserve structured `Owner`, `Touch`, `Priority`, or `Due` fields into Google Sheets. That meant a useful note like:

```text
#wpnetwork
Name: Jordan Miles
Company: Apex Family Office
Context: Helped us with an intro.
Owner: Scooter
Touch: Handwritten note
Priority: High
Due: This week
```

could create an intake row, but the follow-up/touch intent could be lost before review.

### 2. Freeform notes needed better parsing
Real users will write partial or messy notes, not perfect CRM blocks. The parser now accepts structured fields, aliases, and freeform context. Missing details are recorded as `missing_fields` instead of blocking capture.

### 3. Review conversion needed to respect touch intent
When an intake item is converted, the reviewer should not have to manually remember `Touch: Handwritten note`. Conversion now creates a pending `relationship_touches` row when the intake includes a touch request or follow-up language. It remains human-review-only and `execution_allowed=false`.

## Fixes made

- Added flexible trigger parsing aliases.
- Added extraction for email/phone/name/company from messy/freeform notes.
- Added `parsed_owner`, `parsed_touch`, `parsed_priority`, `parsed_due`, and `parsed_needs_touch` to the intake schema and Sheets headers.
- Updated live Sheets normalization for the new fields.
- Updated intake review conversion to create pending relationship touches when a touch is requested.
- Added docs clarifying that structured capture is optional and nonblocking.

## Guardrails preserved

- No trigger intake auto-adds final contacts.
- No touch, card, gift, email, or thank-you sends automatically.
- Public event form submissions land in Intake Queue first.
- Provider failures are not claimed as validated until live provider smoke tests pass.
