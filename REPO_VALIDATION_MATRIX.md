# Repo Validation Matrix

## Hard fail

- Build fails.
- Env validation fails for required server vars.
- Unauthenticated user can access protected production app/API routes.
- Non-allowlisted user can access Network OS production app.
- Admin-only route accessible by non-admin.
- Google OAuth callback fails when configured.
- Gmail sync route fails in provider contract validation.
- Google Sheets write/read path fails when configured.
- Contact creation fails.
- Intake conversion fails.
- Accepted canonical triggers fail detection.
- Instructions page missing required example sections.
- Approval route is accessible without auth.
- Notification approval link approves action directly.
- High-risk approval executes without approved status.
- Exact duplicate email creates duplicate without warning.
- AI executes high-risk action without approval.
- Vendor submission occurs without approval.
- Real plaintext secrets are committed.
- Generated artifacts are accidentally committed.
- ZIP root/packaging is wrong.

## Strong warning

- Relationship Touch workflow incomplete.
- Handwritten note vendor settings missing.
- Weak mobile dashboard layout.
- Visual branding feels generic.
- Missing Google setup docs.
- Missing Gmail trigger docs.
- No audit log for important actions.
- No notification digest path.
- No AI suggestion review route.
- Token storage not using safer server-side store.

## Warning

- Optional LinkedIn field missing.
- Optional city field missing.
- Copy polish needed.
- Optional enrichment absent.
- Gift vendor not integrated yet.
- OCR absent.
- Voice note transcription absent.

## Info / future

- Business card OCR.
- Screenshot OCR.
- Voice transcription.
- AI-assisted parsing improvements.
- Gift vendor API integration.
- Gmail label ingestion.
- D1/Supabase migration.
- Advanced relationship scoring.
- Mobile app.

## Current baseline proof label

STRUCTURALLY CHECKED target. Production provider workflows are not proven until secrets and provider credentials are configured and local/deployed validation runs.


## Phase 7 Pitch Lab handoff

Added signed `/api/intake/pitch-lab` receiver. It creates pending intake rows only and never auto-creates contacts. See `docs/PITCH_LAB_HANDOFF_CONTRACT.md`.


## Phase 9C Network OS handoff review

### Hard fail

- `/api/intake/pitch-lab` accepts unsigned or badly signed requests.
- Pitch Lab request timestamp is not checked against a replay window.
- Consentless Pitch Lab payload is accepted.
- Network OS preserves client-supplied `execution_allowed` or `human_review_required` values instead of overwriting them server-side.
- Pitch Lab intake creates a contact automatically.
- Pitch Lab intake returns success before persistence succeeds.
- Pitch Lab shared secret is exposed outside server env/secrets.

### Strong warning

- Duplicate detection for repeated founder submission is not implemented.
- Optional website is missing.
- No live Google Sheets proof without local credentials.

### Current 9C proof

`npm run test:pitchlab-handoff` statically verifies the receiver contract, replay guard, pending-intake mapping, no-auto-contact posture, and Phase 9C data-trace documentation.
