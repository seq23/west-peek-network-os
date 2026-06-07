# Google Sheets Setup — West Peek Network OS

V1 uses Google Sheets as the persistence layer for West Peek Network data.

## 1. Create the spreadsheet

Create a Google Sheet named:

```text
West Peek Network OS — Production
```

Copy the spreadsheet ID from the URL:

```text
https://docs.google.com/spreadsheets/d/1g2Tyeb8u1sYYQB5dhMEFgIMd5SlZR1h1FxHWUhbG1G8/edit
```

Add that value to the encrypted local secrets bundle and Cloudflare secrets as:

```text
GOOGLE_SHEET_ID=<1g2Tyeb8u1sYYQB5dhMEFgIMd5SlZR1h1FxHWUhbG1G8>
```

## 2. Create required tabs

Create these tabs exactly:

```text
contacts
intake_queue
interactions
relationship_touches
ai_suggestions
approvals
notifications
oauth_accounts
settings
audit_log
```

## 3. Add headers

Paste the following headers into row 1 of each tab.

### contacts

```csv
contact_id,created_at,updated_at,status,first_name,last_name,full_name,email,phone,company,title,linkedin_url,city,relationship_owner,additional_owners,source_type,source_event,source_detail,relationship_type,priority,tags,notes_summary,context_summary,last_touch_date,next_follow_up_date,follow_up_status,touch_needed,touch_status,warmth,trust_level,strategic_value,capital_relevance,dealflow_relevance,founder_relevance,lp_relevance,who_introduced_us,what_we_promised,what_they_promised,what_they_care_about,we_can_help_them_with,helped_us_with,gratitude_reason,personal_context,conversation_energy,created_by,updated_by
```

### intake_queue

```csv
intake_id,created_at,updated_at,source,captured_by,source_user_email,gmail_message_id,gmail_thread_id,raw_text,email_subject,email_from,email_to,email_date,parsed_name,parsed_email,parsed_company,parsed_notes,ai_summary,ai_confidence,possible_duplicate_contact_id,review_status,reviewed_by,reviewed_at,converted_contact_id,attached_contact_id,dismiss_reason
```

### interactions

```csv
interaction_id,contact_id,created_at,interaction_type,channel,summary,raw_source,owner,created_by,follow_up_required,follow_up_date,source_intake_id,gmail_message_id,notes
```

### relationship_touches

```csv
touch_id,contact_id,created_at,updated_at,owner,reason,priority,due_date,status,method,vendor_name,vendor_url,draft_message,approved_by,approved_at,sent_date,gift_cost,notes,created_by,updated_by
```

### ai_suggestions

```csv
suggestion_id,created_at,updated_at,suggestion_type,source_entity_type,source_entity_id,confidence,status,suggested_payload,reasoning_summary,reviewed_by,reviewed_at,applied_entity_type,applied_entity_id,created_by_agent
```

### approvals

```csv
approval_id,created_at,updated_at,approval_type,source_entity_type,source_entity_id,requested_by,assigned_to,relationship_owner,status,risk_level,suggested_payload,human_edits,approved_by,approved_at,rejected_by,rejected_at,execution_status,execution_result,last_notified_at,next_reminder_at,escalation_level
```

### notifications

```csv
notification_id,created_at,updated_at,recipient_email,recipient_user_id,notification_type,channel,subject,body_preview,entity_type,entity_id,priority,status,sent_at,read_at,resolved_at,failure_reason
```

### oauth_accounts

```csv
account_id,user_email,google_account_email,connected_at,last_sync_at,sync_status,scopes,token_status,last_error
```

### settings

```csv
key,value,updated_at,updated_by
```

### audit_log

```csv
audit_id,created_at,actor,action,entity_type,entity_id,summary,metadata,ip_or_session_id
```

## 4. Create Google service account

In Google Cloud Console:

1. Create or open the West Peek project.
2. Enable the Google Sheets API.
3. Create a service account for Network OS.
4. Create a JSON key for that service account.
5. Copy the service account email.
6. Share the Google Sheet with that service account email as Editor.

Required encrypted/local + Cloudflare secret values:

```text
GOOGLE_SHEET_ID
GOOGLE_SERVICE_ACCOUNT_EMAIL
GOOGLE_PRIVATE_KEY
```

For `GOOGLE_PRIVATE_KEY`, preserve the private key as one env value. Escaped newline form is acceptable:

```text
<escaped Google service account private key>
```

## 5. Validate locally

After decrypting `.env.local`, run:

```bash
./scripts/secrets/check-secrets.sh
npm run validate:all
```

## 6. Push production secrets to Cloudflare

```bash
./scripts/secrets/push-cloudflare-secrets.sh
```

This pushes the approved secret keys to the Cloudflare Pages project without printing secret values.

## 7. Important boundary

Do not store raw OAuth refresh tokens in Google Sheets.

Google Sheets stores CRM/workflow data. Raw OAuth token material should live in safer server-side secret storage such as Cloudflare D1/KV/Durable Object or equivalent.
