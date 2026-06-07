# West Peek Network OS — Full Cumulative Build Spec

## 1. Product definition

West Peek Network OS is a private internal relationship intelligence app for West Peek. It captures, organizes, enriches, and operationalizes relationship context from real-world networking.

It is not a generic CRM. It is a relationship memory, intake, AI-assist, approval, notification, and follow-through system for investor conversations, founder conversations, secondaries contacts, family offices, institutional buyers, strategic partners, operators, advisors, event contacts, friends of firm, people who helped West Peek, people West Peek may want to help, contacts captured from live email, notes, Gmail, manual entry, and future business-card/photo/voice workflows.

Core promise: no valuable relationship gets lost after a meeting, intro, event, dinner, conference, email, or note.

The app should help West Peek answer: who did we meet, why do they matter, what was the context, who owns the relationship, what did we promise, what did they promise, what should happen next, who deserves a thoughtful touch, what approvals are waiting, and what relationship work is ready when we have space.

## 2. Correct product language

User-facing name for relationship database: **West Peek Network**.

Primary action: **Add to West Peek Network**.

Short action: **Add Person**.

Avoid as primary UI language: Add to CRM, Add to database, Add to Google Sheet, Add lead, Add prospect.

Technical backend may use contacts, intake_queue, relationship_touches, approvals, notifications, ai_suggestions. User-facing system language stays West Peek Network.

Correct split: tool/app name is Network OS; relationship database name is West Peek Network; primary CTA is Add to West Peek Network.

## 3. Positioning

Correct: West Peek Network OS is a private internal relationship capture, memory, approval, notification, and follow-up system for approved West Peek team members.

Incorrect: public CRM, lead-gen product, public founder tool, investor-facing dashboard, generic sales pipeline, public West Peek Ventures navigation item.

## 4. Repo classification

Repo/app classification: internal authenticated relationship intelligence app with Gmail ingestion, AI-assisted review, approvals, notifications, and Google Sheets persistence.

V1 complexity: Level 4 — authenticated/database-backed app. Future complexity: Level 5 — multi-role/complex product app.

Reasons: protected app, multiple internal users, Gmail OAuth, Google Sheets persistence, AI suggestion workflow, approval gates, approval notifications, role-based access, handwritten note/gift vendor workflow, possible future provider API ordering.

## 5. Repo identity and artifact law

Repo name: `west-peek-network-os`.

Expected baseline ZIP format: `west-peek-network-os-main_BASELINE_MM-DD-YY_<sha>.zip`.

Artifact must be a full baseline snapshot, packaged from the true repo root, without wrapper-folder mistakes, accidental patch ZIPs, `.git`, `node_modules`, local generated folders, plaintext secrets, or local `.env` files. ZIP must be reopened and structurally checked before handoff.

## 6. Hosting and URL map

Primary app: `https://network.joinwestpeek.com`.

Internal Team area: `https://joinwestpeek.com/team`.

Team area access: simple West Peek-branded shared password gate. Password: `3021WPeek`. Any person with the Team password can access the Team area and use the links/tools placed behind it.

Initial Team tools:

- Network OS → `https://network.joinwestpeek.com`
- Venture Deals Calculator → `https://venturedeals.joinwestpeek.com`

Remove the old Secondaries Calculator language. Correct label/URL is Venture Deals Calculator at `venturedeals.joinwestpeek.com`.

## 7. Public venture nav rules

Do not add Network OS to `westpeek.ventures` or `ventures.joinwestpeek.com`.

Do not add Venture Deals Calculator to the public venture nav by default.

Founder Dilution Dashboard should be added to public venture nav. URL: `https://dilution.joinwestpeek.com`. Recommended nav label: Founder Dilution Dashboard. Short/mobile label: Dilution Dashboard.

End-of-build routing/nav aside: create private Team area on joinwestpeek.com; Team area uses password 3021WPeek; add Network OS link; add Venture Deals Calculator link; do not add Network OS or Venture Deals Calculator to public venture nav by default; add Dilution Dashboard to public ventures nav.

## 8. Users and identity model

Initial Network OS users:

- `sequoia@westpeek.ventures`
- `scooter@westpeek.ventures`

Do not use `info@westpeek.ventures` as the sole identity.

Network OS needs separate users because the app must know who met the person, whose Gmail should sync, who owns the relationship, who promised follow-up, who should approve the touch, who sent the note, who should get reminders, who should see “my approvals,” and who should see “my intake.”

Initial roles: Admin and Partner. Recommended initial assignment: Sequoia Admin, Scooter Admin. Future roles: Operator, Assistant, Read-only.

`info@westpeek.ventures` can later be used as a shared inbound address, public-facing contact inbox, fallback sender identity, team notification alias, or vendor account login. It must not be sole app identity, primary Gmail ingestion identity, relationship owner, approval identity, or audit identity.

## 9. Authentication and permission model

Network OS starts with actual app users: Sequoia and Scooter. Future users can be added as West Peek team members join.

Minimum V1: Google OAuth login, approved West Peek email allowlist, server-side session enforcement, protected API routes, no public signup, no demo credentials, no client-side-only auth.

Protected surfaces: `/dashboard`, `/intake`, `/contacts`, `/contacts/:id`, `/touches`, `/approvals`, `/notifications`, `/ai-review`, `/instructions`, `/settings`, `/api/*`.

Every API route must enforce authenticated session, approved email allowlist, role permission, and resource ownership where applicable. UI-only route hiding is not security.

## 10. Gmail integration

Chosen path: Google OAuth + Gmail API inside the app/backend. Do not use Apps Script as primary V1 ingestion.

Each user connects their own Gmail: Sequoia connects `sequoia@westpeek.ventures`; Scooter connects `scooter@westpeek.ventures`.

Store source metadata: gmail_account_owner, gmail_message_id, gmail_thread_id, captured_by, relationship_owner, source_user_email.

## 11. Canonical Gmail trigger set

Primary canonical trigger: `#wpnetwork`.

Accepted aliases: `#addtowestpeek`, `#westpeeknetwork`.

Do not use `#westpeekcrm` as canonical. “CRM” is wrong product language.

Any email containing one accepted trigger creates an Intake Queue item. Trigger flow: trigger → Intake Queue → AI summary/suggestions → human review → Add to West Peek Network. Trigger must not automatically create a final contact.

## 12. Gmail ingestion flow

1. User connects Gmail.
2. User sends, receives, forwards, or self-emails a message containing `#wpnetwork` or an accepted alias.
3. Backend searches Gmail API for matching messages.
4. Backend extracts metadata and body/context.
5. Backend creates intake_queue record.
6. AI summarizes/suggests fields.
7. Human reviews.
8. Human converts to new contact or attaches to existing contact.
9. System writes final record to CRM tabs.
10. Audit log records the action.

Hard rule: Gmail trigger routes to intake_queue first. Never direct Gmail trigger to final contact without review unless later explicitly approved as high-confidence automation.

## 13. In-the-moment email capture

Major use case: “I just met someone, I’m emailing them right now, and I want that same email to capture them into the West Peek Network.”

Instructions section title: Add Someone While Emailing Them.

Product behavior must recognize: trigger in sent email to contact, trigger in received email thread, trigger in forwarded email, trigger in self-email/internal note, and trigger in reply-to-self after sending external email.

For any trigger email, create Intake Queue item, AI summary, suggested contact, suggested owner, suggested touch, suggested priority, suggested due date, and source link/reference to Gmail message.

All in-the-moment captures still route to Intake Queue first.

## 14. Instructions page

Route: `/instructions`. Dashboard link label: How to Add People.

Purpose: teach West Peek users exactly how to add someone to the West Peek Network manually, from Gmail, and while emailing them in the moment.

The page must include manual add instructions, Gmail trigger instructions, canonical trigger, accepted aliases, fast version example, structured version example, minimal version example, Relationship Touch examples, in-the-moment email capture examples, clean external email + internal capture note example, live email with visible trigger example, live email with touch cue example, Intake Queue review instructions, Approval instructions, Notification instructions, and AI suggestion explanation.

Canonical copy: “Use #wpnetwork whenever you want an email or note captured for the West Peek Network.”

Canonical warning: “Using the trigger creates an Intake Queue item. It does not automatically add the person until someone reviews it.”

Required examples include fast version, structured version, minimal version, Relationship Touch version, intro follow-up version, gift/handwritten note version, simple P.S. capture, natural context note, internal capture block below signature, clean external email + internal capture note, live email visible trigger, live email with touch cue, in-the-moment minimal version, and in-the-moment structured version.

## 15. Dashboard quick actions

Dashboard must include: + Add to West Peek Network, Review Intake Queue, Approvals Needed, How to Add People.

Dashboard widgets: New Intake, AI Suggestions Ready for Review, Approvals Needed, Notifications, Touches Due This Week, High-Value Contacts Needing Next Step, Recent Contacts, Recently Sent Touches, Likely Duplicates, Gmail Sync Status.

Tone: calm, operator-grade, no shame, no CRM sludge, no fake sales scoreboard.

## 16. Manual Add flow

Route: `/contacts/new`. Button: + Add to West Peek Network.

Flow: click CTA, enter name/context, add email/company if available, assign owner, decide whether touch is needed, save, person appears in West Peek Network.

Quick Add fields: Name, Email if known, Company if known, Context, Owner, Needs Touch?, Type of Touch if obvious, Priority, Due, Tags. Optional advanced link: Add more details.

## 17. Needs Touch UI

Final capture UI:

- Needs Touch? Yes checkbox
- Why? text field
- Type of Touch, if already obvious: Undecided dropdown
- Options: Undecided, Email, Handwritten note, Gift, Intro, Call, Meeting, Event invite, Other
- Priority: Low, Normal, High
- Due: This week, Next week, Pick date

Rules: Relationship Touch method is optional at capture. Default is Undecided. User may choose method immediately if obvious. App must not force channel selection too early.

## 18. Intake Queue

Route: `/intake`.

Sources: gmail_trigger, manual_note, pasted_notes, business_card_later, voice_note_later.

Each intake item shows source, captured_at, captured_by, raw text/body snippet, detected name, detected email, detected company, AI suggested context, AI confidence, possible duplicate warning, review status, assigned reviewer.

Review actions: Convert to new contact, Attach to existing contact, Mark not useful, Needs more info, Send to AI review.

## 19. Contact profile

Route: `/contacts/:id`.

Sections: Identity, Relationship Context, Interaction History, Relationship Touches, Follow-ups, Approvals, Source Records, Notes, AI Suggestions, Audit Trail.

Important fields: context_summary, who_introduced_us, what_we_promised, what_they_promised, what_they_care_about, helped_us_with, we_can_help_them_with, gratitude_reason, relationship_owner, next_best_action.

## 20. Relationship types and tags

Relationship types: Founder, Investor, LP prospect, Family office, Institutional buyer, Secondaries contact, Advisor, Operator, Strategic partner, Service provider, Friend of firm, Event contact, Media, Community, Other.

Optional tags: High trust, Needs touch, Warm intro, Potential LP, Buyer, Seller, Founder, Advisor, Friend of firm, Secondaries, West Peek Live, West Peek Ventures, Follow-up promised, Thank-you needed.

Avoid creepy or overly transactional language.

## 21. Relationship Touch system

Relationship Touch means any intentional action that strengthens or maintains a relationship: email thank-you, handwritten note, thoughtful gift, intro, call, lunch, article/share, book recommendation, event invite, founder/customer connection.

Psychological principle: I remembered. I appreciated it. I followed through. Not: I spent money.

Touch dashboard buckets: Today, This Week, When You Have Space, Waiting, Done. Avoid shame-heavy CRM language like OVERDUE, FAILED, NEGLECTED unless it is a true execution failure.

## 22. Handwritten note and gift vendor workflow

Default handwritten note vendor candidate: Handwrytten. Backup/comparison candidate: Simply Noted.

V1 vendor integration: default vendor name, default vendor URL, draft note message, copy/open vendor workflow, mark as sent, audit log.

V1.5/V2 can support submit handwritten note order via vendor API, retrieve status, record cost, record delivery state.

Provider abstraction: createHandwrittenNoteDraft(), priceHandwrittenNote(), submitHandwrittenNote(), getHandwrittenNoteStatus().

Gift workflow V1: AI suggests gift idea; human reviews gift, cost, reason, address, and appropriateness; human approves; app records task/status; human manually orders or marks completed. No fully automatic gift ordering in V1.

## 23. AI Relationship Assistant

Do not build full autonomous AI agent from scratch in V1. Do not make Twin the core system.

Correct architecture: West Peek Network OS owns data, permissions, workflows, review queues, approval gates, audit logs, execution rules. Claude API powers summaries, drafts, classifications, suggestions, relationship reasoning.

Name: West Peek Relationship Assistant.

AI can draft/suggest cleaned intake summaries, suggested contact fields, relationship type, tags, priority, follow-up date, touch type, email thank-you drafts, handwritten note drafts, gift ideas, duplicate candidates, context summaries, owner recommendations, and next-best-action suggestions.

AI can write to ai_suggestions, draft_touches, duplicate_candidates, draft_interactions, approvals.

Approval required before sending emails, ordering handwritten notes, ordering gifts, merging contacts, deleting contacts, changing ownership, changing admin/security settings, or submitting vendor orders.

AI may automatically finalize low-risk cleanup: formatting normalization, date normalization, tag normalization, source metadata attachment, exact duplicate detection flag, and interaction log creation from reviewed/approved intake.

AI law: AI prepares. Human approves. System executes. Audit log records.

Routes: `/ai-review`, `/ai-review/intake`, `/ai-review/duplicates`, `/ai-review/touches`.

## 24. Human approval gates

Human approval gates are internal West Peek approval steps before relationship-sensitive actions are finalized or executed. The app does not email the outside contact/client asking for approval to be thanked, followed up with, or added to internal relationship records.

Route: `/approvals`. Dashboard widget: Approvals Needed. Header badge: Approvals: 3.

Approval categories: contact creation approvals, duplicate merge approvals, relationship touch approvals, email draft approvals, handwritten note approvals, gift approvals, ownership change approvals, delete/archive approvals, vendor submission approvals.

Risk levels: low, medium, high.

Default approver: assigned_to. Fallback: assigned_to, relationship_owner, contact owner, admin.

No one-click approval from email. Email notification → authenticated app → approval action → audit log.

## 25. Approval notification system

Purpose: notify West Peek team members when approval is waiting, without turning the app into another noisy inbox.

Core rule: Notifications should surface important pending actions, not punish people for being busy.

V1: in-app notifications, header badge, dashboard widget, daily approval digest, immediate email only for high-priority approvals.

Do not send system notifications from Scooter/Sequoia personal Gmail accounts. Recommended system sender: `network@joinwestpeek.com`.

Immediate notifications only for high-priority relationship touch, gift approval, handwritten note approval marked high priority, approval involving high-value contact, and execution failure after approval.

Batched notifications: morning digest for pending approvals today, afternoon reminder only if high-priority items remain.

Notification states: unread, read, dismissed, resolved, failed.

Escalation: 0–24 hours shown in app + digest; 24–72 hours digest + reminder if Normal/High; 72+ hours escalate to admin/team dashboard; High priority immediate notification + digest until resolved.

Use calm wording: Still waiting for review, Needs decision, Ready when you are. Avoid Overdue, Failed, Neglected unless true execution failure.

Default settings: email notifications on, daily digest on, immediate high-priority on, low-priority immediate off, quiet hours 8 PM–8 AM Central, timezone America/Chicago.

## 26. Duplicate detection

Required controls: exact email match = hard duplicate warning; same normalized full name + company = strong duplicate warning; similar name + similar company = weak warning.

User actions: Create anyway, Attach to existing, Merge later, Dismiss duplicate warning.

## 27. Data layer

V1 CRM data layer: Google Sheets.

Google Sheets is acceptable for contacts, intake_queue, interactions, relationship_touches, ai_suggestions, approvals, notifications, settings metadata, audit_log.

Google Sheets is not ideal for raw OAuth refresh tokens. Recommended token storage: Cloudflare D1, Cloudflare KV with encryption/strict access, Durable Object, future Supabase.

Best V1: Sheets for CRM data; safer server-side storage for OAuth token material; Sheets only for token metadata/status.

Required Google Sheet tabs: contacts, intake_queue, interactions, relationship_touches, ai_suggestions, approvals, notifications, oauth_accounts, settings, audit_log.

## 28. Data schemas

Canonical full schemas live in `docs/data-schemas.md` and `src/domain/types.ts`. They include contacts, intake_queue, interactions, relationship_touches, ai_suggestions, approvals, notifications, oauth_accounts, settings, and audit_log.

## 29. Routes

Frontend routes: `/`, `/auth/login`, `/auth/callback/google`, `/dashboard`, `/instructions`, `/intake`, `/contacts`, `/contacts/new`, `/contacts/:id`, `/touches`, `/approvals`, `/notifications`, `/ai-review`, `/settings`.

API routes: `/api/session`, `/api/auth/google/start`, `/api/auth/google/callback`, `/api/gmail/connect`, `/api/gmail/disconnect`, `/api/gmail/sync`, `/api/intake`, `/api/intake/:id/convert`, `/api/intake/:id/attach`, `/api/contacts`, `/api/contacts/:id`, `/api/touches`, `/api/touches/:id`, `/api/approvals`, `/api/approvals/:id/approve`, `/api/approvals/:id/reject`, `/api/notifications`, `/api/notifications/:id/read`, `/api/settings`, `/api/audit`, `/api/ai/suggest`, `/api/ai/draft-touch`, `/api/ai/summarize-intake`.

## 30. Visual branding and design system

Use West Peek branding consistent with joinwestpeek.com and westpeek.live: West Peek orange, black, white, premium investor feel, clean internal dashboard, not generic SaaS blue, not bubbly startup CRM.

Design principle: investor-grade internal command center, warm relationship memory, low-friction capture, no CRM sludge.

## 31. Provider contracts

Google OAuth: authenticate approved users and connect Gmail access. Requires least-privilege scopes, server-side token handling, disconnect/revoke flow, allowlist enforcement.

Gmail API: search trigger phrase and ingest matching messages into Intake Queue. Requires sync status, last synced timestamp, error handling, duplicate Gmail message prevention, revoked-token handling.

Google Sheets API: temporary CRM persistence. Requires stable schema, schema validation, append/update/read behavior, safe failure states, missing-column detection.

Claude/Anthropic API: AI summarization, drafting, classification, duplicate suggestion, relationship touch suggestions. Requires no automatic sensitive execution, audit/suggestion records where appropriate, human approval for sensitive actions, fallback when API unavailable.

Handwritten note provider: prepare or submit handwritten relationship touches after approval. Requires provider abstraction, manual V1 path, API path later, human approval before submission, cost/status record if integrated.

Transactional email provider: send approval notifications and daily digests. Must not send from personal Gmail; notification link opens authenticated app; notification failure does not execute approval.

## 32. Secrets / Configuration Plan — locked

Goal: avoid scattered environment-variable drama while keeping real secrets out of plaintext repo files.

Decision: local/operator setup uses one encrypted secrets bundle committed to the repo.

Encrypted file: `secrets/network-os.local.env.gpg`.

Password: `3021WPeek`.

The repo includes decrypt script: `scripts/secrets/decrypt-local-env.sh`.

The decrypt script prompts for the password and generates `.env.local`.

Repo may include encrypted bundle, decrypt script, check script, Cloudflare secret push script, `.env.example`, `.env.local.example`, and `ENVIRONMENT_VARIABLES.md`.

Repo must not include `.env`, `.env.local`, plaintext API keys, plaintext OAuth secrets, plaintext Google private keys, plaintext Anthropic key, plaintext vendor keys, or password embedded inside scripts.

Production secrets are stored in Cloudflare secret/environment settings.

Cloudflare Secret Push Rule: repo includes `scripts/secrets/push-cloudflare-secrets.sh`, which reads approved keys from decrypted `.env.local` and pushes them to the Cloudflare Pages project using Wrangler without printing secret values.

Operator flow: decrypt local env, check secrets, push Cloudflare secrets.

Some one-time setup remains manual: Wrangler login, Cloudflare Pages project/repo connection if missing, custom domain `network.joinwestpeek.com`, and Google OAuth redirect URL setup.

## 33. Repo-owned documentation required

Required docs: README, REPO_IDENTITY, REPO_VALIDATION_MATRIX, ARCHITECTURAL_DECISIONS, ENVIRONMENT_VARIABLES, Google OAuth setup, Google Sheets setup, Gmail trigger setup, notification setup, handwritten note provider setup, Cloudflare deployment, security model, approval gates, AI relationship assistant, West Peek routing aside, instructions page content, full cumulative build spec, data schemas, and provider contracts.

## 34. Recommended stack

TypeScript, React, Vite, Cloudflare Pages, Cloudflare Workers/Functions, Google OAuth, Gmail API, Google Sheets API, Claude/Anthropic API, Zod, Playwright, env validator, secret scanner.

Prefer Vite + React + Cloudflare Workers/Functions unless Next.js features are specifically needed.

## 35. Acceptance criteria

V1 is acceptable only if app runs at network.joinwestpeek.com, West Peek branded, protected Google login/allowlist exists, initial users exist, app does not depend on info@ as sole identity, backend APIs enforce auth, admin settings are admin-only, users can connect Gmail, Gmail trigger search can ingest `#wpnetwork`, aliases are recognized, trigger emails enter intake queue, manual Add to West Peek Network exists, intake review and conversion/attach exist, exact email duplicate warning exists, contacts persist to Google Sheets, contact profile shows relationship context/history, Needs Touch UI exists with optional type/default Undecided, Relationship Touch methods exist, handwritten vendor configurable, AI suggestions go to review queues, human approval gates exist, approval notifications exist, email notification links require auth and do not approve directly, relationship owner controls approval assignment, docs exist, instructions page includes all examples, Team page plan exists with password, Team includes Network OS and Venture Deals Calculator, public nav rules are documented, repo includes validation matrix/ADRs/env docs, no real secrets committed, Playwright covers primary journeys, full baseline ZIP is packaged/reopened, and status label is honest.

## 36. Validation matrix and Playwright depth

Hard fail/strong warning/warning/future matrix lives in `REPO_VALIDATION_MATRIX.md`.

Playwright required depth: transactional + persistence E2E. Tests should cover auth blocking, approved login/session flow, dashboard, manual contact creation, exact duplicate warning, intake queue, trigger fixtures, aliases, intake conversion/attach, Relationship Touch creation, approval flows, notification auth, instructions examples, settings admin-only, and mobile smoke.

## 37. Deep Validation decision

Deep Validation recommended: fresh unpack, package manager detection, dependency install, typecheck, lint/static checks, env validation, secret scan, unit tests, build, ZIP structural checks. Playwright separate unless explicitly included.

## 38. Build commands

Use 8 GB-safe memory defaults:

```bash
npm ci 2>&1 | tee logs/npm-ci.log
NODE_OPTIONS="--max-old-space-size=3072" npm run build 2>&1 | tee logs/build.log
npm run validate:all 2>&1 | tee logs/validate-all.log
```

## 39. Hostile review summary

Software risks: OAuth token storage, UI-only auth, Google Sheets schema drift, Gmail failure states, AI silent execution, email approval bypass, vendor submission without approval, vague instructions. Mitigate through server auth, allowlist, least scopes, safer token storage, schema validator, intake first, approval gates, audit log, provider abstraction, concrete instructions, no hidden production mocks.

VC operator risks: generic CRM, no intake review, missing owner, lost context, guilt touches, heavy data entry, clunky live-event capture. Mitigate through Quick Add, owner required, context_summary emphasis, calm touch workflow, AI prep, human approval, in-the-moment email capture instructions.

Master networker risks: CRM language kills warmth, transactional follow-up, spend-focused gifts, visible trigger awkwardness, hoarding instead of remembering. Mitigate with Add to West Peek Network language, warmth/trust/help/gratitude framing, undecided touch type, thoughtful non-monetary touches, clean external email + internal capture note, future Gmail label ingestion.

Relationship psychology risks: dashboard shame, overdue avoidance, creepy personal context, fake automated messages, too many capture decisions. Mitigate with calm buckets, approval before communication, capture why they matter, avoid creepy over-collection, do not force touch channel at capture.

## 40. Current proof label

This baseline is structurally checked and build-tested. Provider runtime, production auth, Cloudflare deployment, Gmail API, Google Sheets API, Claude API, handwritten note vendor, and transactional email are not proven until configured and validated locally/deployed.
