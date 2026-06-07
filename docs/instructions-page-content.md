# Instructions Page Content

Route: `/instructions`

Dashboard link label: **How to Add People**

The instructions page must teach users how to add people to the West Peek Network without forcing them to understand the whole system first.

Core rule:

- **Manual Add** saves directly when the person is already clear.
- **Gmail trigger routes** create Intake Queue items first.
- **No Gmail-triggered capture becomes final until a human reviews it.**

## Canonical trigger

Primary trigger: `#wpnetwork`

Accepted aliases:

- `#addtowestpeek`
- `#westpeeknetwork`

Do not use `#westpeekcrm` as canonical language.

## Required route explanations

### 1. Manual Add

Use when the person is already clear enough to enter directly.

Example:

```text
Name: Mike MacCombie
Company: MacCombie Group
Context: Helped West Peek with a valuable intro and should receive a thoughtful thank-you.
Owner: Scooter
Needs Touch: Yes
Touch: Handwritten note
Priority: High
Due: This week
```

### 2. Reply in the existing email thread

Use when someone meets a contact at a conference/event and is already replying by email. The reply may include an internal capture block.

Example:

```text
Subject: Great meeting you at the conference

Jordan,

Great meeting you today — really enjoyed the conversation and would love to stay close.

Best,
Scooter

--
Internal West Peek capture:
#wpnetwork
Name: Jordan Miles
Company: Apex Family Office
Context: Met at the conference. Wants to review late-stage venture deal flow.
Owner: Scooter
Needs Touch: Yes
Touch: Email
Priority: High
Due: This week
```

### 3. Forward an email to yourself

Use when the outside email should stay clean and the trigger/context should be private. Send the external email first, then forward it to your own West Peek email with `#wpnetwork` and context at the top.

Example:

```text
To: scooter@westpeek.ventures
Subject: Fwd: Great meeting you

#wpnetwork
Name: Jordan Miles
Company: Apex Family Office
Context: Met at the conference. Good LP/family-office relationship. Asked to see late-stage venture opportunities.
Owner: Scooter
Needs Touch: Yes
Touch: Email
Priority: High
Due: This week

---------- Forwarded message ---------
From: Jordan Miles <jordan@example.com>
Subject: Great meeting you
```

### 4. Send yourself a standalone note

Use for hallway conversations, dinners, calls, texts, or memory captures that are not attached to an outside email thread.

Example:

```text
#wpnetwork
Met Sarah Lee at dinner. Horizon Capital. Strong LP conversation. Sequoia owns. Follow up next week with a warm email and invite her into future West Peek updates.
```

### 5. Live visible trigger

Use only when it is acceptable for the recipient to see the trigger.

Example:

```text
Subject: Great meeting you

Sarah,

Great meeting you today — really enjoyed learning more about what you’re building. Let’s stay close.

Best,
Sequoia

#wpnetwork
```

## Required examples by detail level

Fast and minimal are not the same.

### Fast capture

Short but actionable. Includes enough context to act.

```text
#wpnetwork
Mike MacCombie — helped us with an intro. Scooter owns. Send handwritten thank-you this week.
```

### Minimal capture

Incomplete, but worth capturing so it is not lost.

```text
#wpnetwork
Great contact from today’s event. Need to identify company and decide follow-up next week.
```

### Structured capture

Best quality for Intake Queue review.

```text
#wpnetwork
Name: Mike MacCombie
Company: MacCombie Group
Context: Helped us with an intro.
Owner: Scooter
Needs Touch: Yes
Touch: Handwritten note
Priority: High
Due: This week
```


## 2026-06-07 Capture overhaul

The live instructions tab now explains minimal on-the-spot Gmail capture, reply-thread capture, forward-to-self capture, standalone notes, business-card/screenshot OCR, voice-note transcription, and WP-branded thank-you cards. Minimal capture is intentionally allowed: `#wpnetwork` can be enough when Gmail envelope data provides name/email and humans can enrich later.


## Flexible structured intake rule

Structured capture is optional and nonblocking. A message may include every field, one field, or only `#wpnetwork`. The system uses whatever is present, infers name/email from the Gmail envelope when possible, stores missing fields for human review, and never blocks intake just because company, owner, touch, priority, due date, or context is missing.

Example structured capture:

```text
#wpnetwork
Name: Mike MacCombie
Company: MacCombie Group
Context: Helped us with an intro.
Owner: Scooter
Touch: Handwritten note
Priority: High
Due: This week
```
