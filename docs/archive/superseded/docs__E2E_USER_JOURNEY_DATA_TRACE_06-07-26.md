<!-- ARCHIVED: superseded by active runbooks / ledgers. See docs/archive/ARCHIVE_INDEX.md and docs/DOCS_CONSOLIDATION_MAP.md. -->

# End-to-End User Journey Data Trace — West Peek Network OS

## Global guardrails

Every capture path must preserve these controls:

- Intake first unless an operator explicitly creates a final contact.
- Missing fields are nonblocking.
- `human_review_required=true` for AI/capture/event intake.
- `execution_allowed=false` for AI suggestions, thank-you drafts, handwritten notes, vendor handoffs, and external sends.
- Google Sheets is the shared persistence layer.
- App refresh pulls latest spreadsheet rows back into the UI.

---

## 1. Minimal Gmail trigger

Input:

```text
Great meeting you today.

#wpnetwork
```

Trace:

1. Gmail trigger route/search finds `#wpnetwork`.
2. Raw message body/thread metadata becomes source context.
3. Name/email may be inferred from sender/recipient if available.
4. Intake Queue row is appended.
5. Missing fields are recorded, not blocked.
6. Review status is `pending_human_review`.
7. No final contact is created until operator review.

Gaps to validate live: deployed Gmail sync/polling behavior.

---

## 2. Messy/freeform trigger

Input:

```text
#wpnetwork Jordan Miles helped us with an intro, send handwritten note this week
```

Trace:

1. Trigger parser detects canonical trigger.
2. Flexible parser extracts probable name/context/touch/due where possible.
3. Non-detected fields remain blank.
4. Intake Queue row persists parsed + raw text.
5. If reviewed/converted, handwritten touch is created as pending approval.
6. Nothing sends automatically.

---

## 3. Structured trigger

Input:

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

Trace:

1. Structured parser stores optional fields.
2. Intake Queue row includes parsed owner/touch/priority/due.
3. On convert, contact row is appended.
4. Relationship touch row is appended with `pending_approval`.
5. Approval decision moves touch to `approved_ready_to_send`.
6. Operator chooses vendor or self-fulfillment.
7. Operator manually marks sent externally.

---

## 4. Manual add

Input options:

- Name only
- Email only
- Company only
- Context note only
- Any combination above

Trace:

1. Operator enters whatever is available.
2. UI supplies enrich-later context if context is blank.
3. Server accepts at least one identifying field.
4. Contact row appends to Sheets.
5. Optional touch can be created when `Needs Touch` is checked.

---

## 5. Event public form link

Input:

- Operator creates event: `GP Wine Night`.
- Public link `/e/gp-wine-night` is generated.
- Attendee submits name/email/company/title/LinkedIn/interest/consent.

Trace:

1. Event row appends to `events`.
2. Public form reads active event from Sheets.
3. Submission appends `event_attendees` row.
4. Submission appends matching `intake_queue` row.
5. Status remains `pending_human_review`.
6. Event dashboard shows attendee after refresh.
7. No public upload or admin action is exposed.

---

## 6. Event private context

Input:

- Operator adds private context to an event attendee.

Trace:

1. Authenticated operator submits event context.
2. `event_attendees` row appends with source `event_private_note`.
3. Intake Queue row appends with private notes.
4. Missing fields are recorded.
5. No final contact is created automatically.

---

## 7. Business card / notes screenshot / HEIC

Input:

- Operator uploads JPG/PNG/WEBP/HEIC/HEIF card or screenshot.

Trace:

1. Browser attempts HEIC/HEIF normalization to JPEG when needed.
2. Authenticated media route validates image type.
3. Claude Vision extracts probable fields and raw text.
4. Intake row appends with extracted fields, confidence, missing fields, and `internal_data_trace`.
5. If tied to an event, event attendee row also appends.
6. Human reviews before conversion.

Gaps to validate live: Anthropic billing/API key/model access and one real card image.

---

## 8. Voice note / iPhone voice memo

Input:

- Operator uploads M4A/MP3/WAV/WEBM/MP4/AAC.

Trace:

1. Authenticated media route validates audio type.
2. Google Speech-to-Text transcribes audio.
3. Claude structures transcript into intake fields.
4. Intake row appends with transcript, extracted fields, confidence, and trace.
5. If tied to event, event attendee row also appends.
6. Human reviews before conversion.

Gaps to validate live: Google Cloud Speech-to-Text API enablement/billing and one real M4A.

---

## 9. Thank-you card studio

Input:

- Operator enters recipient/reason/tone/from/due.

Trace:

1. Thank-you route drafts/saves relationship touch.
2. WP branded preview shows message.
3. Operator can copy copy or open email draft.
4. Relationship touch remains approval/manual-send controlled.
5. No silent email/card/vendor execution.

---

## 10. Handwritten note fulfillment

Input:

- Touch: handwritten note.

Trace:

1. Intake conversion creates pending relationship touch.
2. Approval route marks it approved/ready for fulfillment.
3. Operator chooses Handwrytten, Simply Noted, Postable, or “I’ll do it myself.”
4. App copies relevant details and opens vendor/self path.
5. Operator pays/sends/writes externally.
6. Operator marks sent externally.
7. Sheets row appends latest status.

No automated payment/order is implemented by design.

---

## 11. AI suggestion smoke test

Trace:

1. Authenticated operator runs AI Helper.
2. Claude route creates pending AI suggestion.
3. Suggestion appends to `ai_suggestions`.
4. Response includes `internal_data_trace`.
5. `execution_allowed=false`.

Gaps to validate live: Anthropic account credits and deployed secret.

---

## 12. Spreadsheet sync

Trace:

1. App loads `/api/sheets/snapshot` after OAuth session.
2. Snapshot reads latest rows from `contacts`, `intake_queue`, `relationship_touches`, `approvals`, `notifications`, `ai_suggestions`, `events`, and `event_attendees`.
3. App normalizes rows into UI state.
4. Write actions append rows to Sheets.
5. Refresh reloads latest Sheet state.
6. Latest-row collapse makes append-only status updates visible.

---

## 13. OAuth/session check

Trace:

1. App calls `/api/session` on load.
2. If signed `wpn_session` cookie is valid and allowlisted, UI shows connected email.
3. Settings provides connect/reconnect Gmail link.
4. Source of truth for stored OAuth tokens remains `oauth_tokens` tab.

---

## 14. Provider failure path

Expected behavior:

- Provider failure returns an error and trace.
- No contact is created.
- No send/order/payment happens.
- Operator can retry or manually add.

