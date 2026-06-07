# West Peek Network OS — Canonical Data Schemas

These schemas describe the V1 Google Sheets backing model and the typed domain model. Google Sheets is the V1 CRM data store; raw OAuth refresh tokens should use safer server-side storage.

## Required tabs

- contacts
- intake_queue
- interactions
- relationship_touches
- ai_suggestions
- approvals
- notifications
- oauth_tokens
- settings
- audit_log

## contacts

`contact_id`, `created_at`, `updated_at`, `status`, `first_name`, `last_name`, `full_name`, `email`, `phone`, `company`, `title`, `linkedin_url`, `city`, `relationship_owner`, `additional_owners`, `source_type`, `source_event`, `source_detail`, `relationship_type`, `priority`, `tags`, `notes_summary`, `context_summary`, `last_touch_date`, `next_follow_up_date`, `follow_up_status`, `touch_needed`, `touch_status`, `warmth`, `trust_level`, `strategic_value`, `capital_relevance`, `dealflow_relevance`, `founder_relevance`, `lp_relevance`, `who_introduced_us`, `what_we_promised`, `what_they_promised`, `what_they_care_about`, `we_can_help_them_with`, `helped_us_with`, `gratitude_reason`, `personal_context`, `conversation_energy`, `created_by`, `updated_by`.

## intake_queue

`intake_id,created_at,updated_at,source,capture_type,captured_by,source_user_email,source_file_name,source_file_type,gmail_message_id,gmail_thread_id,raw_text,email_subject,email_from,email_to,email_date,parsed_name,parsed_email,parsed_phone,parsed_company,parsed_title,parsed_website,parsed_notes,parsed_owner,parsed_touch,parsed_priority,parsed_due,parsed_needs_touch,extracted_text,transcript_text,missing_fields,ai_summary,ai_confidence,internal_data_trace,human_review_required,execution_allowed,review_status,reviewed_by,reviewed_at,converted_contact_id,attached_contact_id,dismiss_reason,event_id,event_name,event_slug`.

Review statuses: `new`, `ai_reviewed`, `pending_human_review`, `needs_human_review`, `converted`, `attached`, `dismissed`, `needs_more_info`.

Flexible structured intake rule: every field after `#wpnetwork` is optional. The system stores whatever is present, infers name/email from Gmail envelope when available, records `missing_fields`, and can preserve `Owner`, `Touch`, `Priority`, and `Due` as `parsed_owner`, `parsed_touch`, `parsed_priority`, and `parsed_due`. Touch requests create pending relationship touch records only after human review/conversion; nothing sends automatically.

## interactions

`interaction_id`, `contact_id`, `created_at`, `interaction_type`, `channel`, `summary`, `raw_source`, `owner`, `created_by`, `follow_up_required`, `follow_up_date`, `source_intake_id`, `gmail_message_id`, `notes`.

Interaction types: `email`, `call`, `meeting`, `intro`, `event`, `note`, `touch`, `gift`, `handwritten_note`, `other`.

## relationship_touches

`touch_id`, `contact_id`, `created_at`, `updated_at`, `owner`, `reason`, `priority`, `due_date`, `status`, `method`, `vendor_name`, `vendor_url`, `draft_message`, `approved_by`, `approved_at`, `sent_date`, `gift_cost`, `notes`, `created_by`, `updated_by`.

Statuses: `needed`, `planned`, `drafted`, `pending_approval`, `approved`, `sent`, `skipped`, `cancelled`, `failed`.

Methods: `undecided`, `email`, `handwritten_note`, `gift`, `intro`, `call`, `meeting`, `event_invite`, `other`.

Default method: `undecided`.

## ai_suggestions

`suggestion_id`, `created_at`, `updated_at`, `suggestion_type`, `source_entity_type`, `source_entity_id`, `confidence`, `status`, `suggested_payload`, `reasoning_summary`, `reviewed_by`, `reviewed_at`, `applied_entity_type`, `applied_entity_id`, `created_by_agent`.

Suggestion types: `contact_cleanup`, `duplicate_candidate`, `touch_recommendation`, `email_draft`, `handwritten_note_draft`, `gift_idea`, `follow_up_recommendation`, `context_summary`, `tag_recommendation`, `owner_recommendation`, `priority_recommendation`.

Statuses: `pending`, `approved`, `edited`, `dismissed`, `applied`.

## approvals

`approval_id`, `created_at`, `updated_at`, `approval_type`, `source_entity_type`, `source_entity_id`, `requested_by`, `assigned_to`, `relationship_owner`, `status`, `risk_level`, `suggested_payload`, `human_edits`, `approved_by`, `approved_at`, `rejected_by`, `rejected_at`, `execution_status`, `execution_result`, `last_notified_at`, `next_reminder_at`, `escalation_level`.

Statuses: `pending`, `approved`, `edited`, `rejected`, `executed`, `failed`, `cancelled`.

Risk levels: `low`, `medium`, `high`.

## notifications

`notification_id`, `created_at`, `updated_at`, `recipient_email`, `recipient_user_id`, `notification_type`, `channel`, `subject`, `body_preview`, `entity_type`, `entity_id`, `priority`, `status`, `sent_at`, `read_at`, `resolved_at`, `failure_reason`.

Statuses: `unread`, `read`, `dismissed`, `resolved`, `failed`.

## oauth_tokens

`account_id`, `user_email`, `google_account_email`, `connected_at`, `last_sync_at`, `sync_status`, `scopes`, `token_status`, `last_error`.

Do not store raw refresh tokens in Google Sheets.

## settings

`key`, `value`, `updated_at`, `updated_by`.

Settings include: `GMAIL_TRIGGER_PHRASE`, `ACCEPTED_TRIGGER_ALIASES`, `GOOGLE_SHEET_ID`, `DEFAULT_RELATIONSHIP_OWNER`, `DEFAULT_TOUCH_VENDOR_NAME`, `DEFAULT_TOUCH_VENDOR_URL`, `ALLOWED_USERS`, `NOTIFICATION_EMAIL_FROM`, `EMAIL_NOTIFICATIONS_ENABLED`, `DAILY_DIGEST_ENABLED`, `IMMEDIATE_HIGH_PRIORITY_ENABLED`, `QUIET_HOURS_START`, `QUIET_HOURS_END`, `TIMEZONE`.

## audit_log

`audit_id`, `created_at`, `actor`, `action`, `entity_type`, `entity_id`, `summary`, `metadata`, `ip_or_session_id`.

Actions include: `login`, `logout`, `gmail_connected`, `gmail_disconnected`, `gmail_sync_started`, `gmail_sync_completed`, `gmail_sync_failed`, `intake_created`, `intake_reviewed`, `contact_created`, `contact_updated`, `contact_merged`, `contact_deleted`, `touch_created`, `touch_updated`, `touch_approved`, `touch_sent`, `approval_created`, `approval_approved`, `approval_rejected`, `notification_sent`, `settings_changed`, `vendor_submission_attempted`, `vendor_submission_completed`, `vendor_submission_failed`.


## Added capture fields

`intake_queue` now supports capture/source metadata for business cards, notes screenshots, voice notes, partial Gmail captures, transcripts, extracted text, missing fields, internal data trace, and explicit human-review guardrails.

`relationship_touches` now supports WP virtual thank-you card fields: recipient name/email, card type, card title, draft message, email subject/body, approval_required, execution_allowed, and internal_data_trace.


## Events

`events`

- event_id
- created_at
- updated_at
- event_name
- event_slug
- event_date
- location
- owner_email
- status: active / closed
- notes
- public_form_enabled
- public_form_url

`event_attendees`

- event_attendee_id
- event_id
- event_name
- event_slug
- created_at
- updated_at
- public_name
- public_email
- public_company
- public_title
- public_phone
- public_linkedin
- public_interest
- private_context
- private_voice_transcript
- ai_summary
- review_status
- confidence
- missing_fields
- source_type
- created_by
- source_intake_id
- consent_follow_up

Event rows are wrappers over Intake Queue. Public form submissions also append an `intake_queue` row with `source=event_public_form`. Internal event notes append `source=event_private_note`. Event-linked card/screenshot/voice uploads append event-linked intake rows and event_attendees rows.
