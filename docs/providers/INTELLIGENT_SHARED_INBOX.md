# Intelligent Shared Inbox Monitor

Status: ACTIVE
Mailbox: `info@westpeek.ventures`

## Purpose

Monitor the shared inbox without turning every inbound email into deal flow. The monitor is deterministic, review-only, and deliberately lightweight.

## Classification

Messages receive weighted signals:

- Pitch/fundraise language: strong positive signal.
- Founder/company introduction: positive signal.
- Traction, finance metrics, deck, one-pager, data room: positive signal.
- Relationship introduction or referral: capture as relationship intake when relevant.
- Receipts, invoices, password/security notices, newsletters, calendar notices, delivery failures, and generic marketing solicitations: negative signals.

Outcomes:

- `pitch`: captured as deal-flow intake.
- `company_info`: captured as deal-flow intake for human review.
- `relationship`: captured as relationship intake.
- `operational` or `noise`: inspected but not written to Intake.

No message creates a contact, sends an email, or executes an introduction automatically.

## Deduplication

The stable identity is mailbox plus Gmail message ID. RFC Message-ID is a fallback. The endpoint rechecks Sheets immediately before append and uses a deterministic intake ID. This materially reduces duplicate writes without adding a database or queue. It does not provide a cross-region atomic uniqueness guarantee; live duplicate proof remains required.

## Operator evidence

A sync response reports imported, duplicate-skipped, irrelevant-skipped, and failed-message counts. Low-confidence messages remain human-review work only.
