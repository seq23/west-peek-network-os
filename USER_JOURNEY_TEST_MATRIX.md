# User Journey Test Matrix

| Persona | Action | Expected state change | Proof tier |
|---|---|---|---|
| Owner/operator | Connect Gmail OAuth | session + OAuth status + token row | Tier 4 |
| Owner/operator | Import Gmail trigger | intake row, duplicate guard, no auto-execution | Tier 4 |
| Owner/operator | Review intake | convert/attach/dismiss persisted | Tier 4 |
| Public attendee | Submit event form | event/public intake row persisted | Tier 4 |
| Pitch Lab | Send signed handoff | signed row persisted; bad/replay rejected | Tier 4 |

# User Journey Test Matrix

Major journeys requiring Tier 4 live proof:

- OAuth connect and Gmail status
- Gmail trigger import and duplicate skip
- Google Sheets write/readback
- human review conversion/attach/dismiss
- contact workflow
- relationship touch approval
- public event intake
- Pitch Lab signed handoff
- AI/OCR/voice review-only intake
- auth/session boundaries

- `tier4-prereq-postdeploy-strict`
- `tier4-oauth-connect-live`
- `tier4-gmail-trigger-ingestion-live`
- `tier4-google-sheets-readwrite-live`
- `tier4-human-review-workflow-live`
- `tier4-contact-workflow-live`
- `tier4-relationship-touch-live`
- `tier4-public-event-live`
- `tier4-pitchlab-signed-handoff-live`
- `tier4-ai-ocr-voice-live`
- `tier4-auth-boundary-live`
- `tier4-runtime-context-live`
- `tier4-report-check`
