import { Header } from './App';

const routes = [

  {
    title: '1. Event form link / QR-friendly capture',
    bestFor: 'You are at Tech Week, Pre-Seed Summit, GP Wine Night, a dinner, or a conference and want people to enter their own details.',
    happens: 'Create one event, copy the public form link, and share it. Attendee submissions create event_attendees and Intake Queue rows with pending human review. Scooter can add private context later by text, card/screenshot, or voice.',
    steps: ['Open Events.', 'Create the event once.', 'Copy or open the public form link.', 'Share it with people in the room.', 'Review everyone on the event dashboard later.'],
    exampleTitle: 'Event examples',
    example: `Create event: GP Wine Night
Share form: https://network.joinwestpeek.com/e/gp-wine-night
Attendee enters: Name, email, company, title, LinkedIn, and what West Peek should know.`
  },
  {
    title: '2. Email them on the spot — default conference hack',
    bestFor: 'You just met someone and want to send a real email before the moment disappears.',
    happens: 'Send the normal email. Add the canonical trigger. If that is all the system has, it should still create an Intake Queue item using the person’s email/name from Gmail when available.',
    steps: ['Send a short normal email from your West Peek Gmail.', 'Add #wpnetwork if you are comfortable with the trigger being visible.', 'Review the Intake Queue later and enrich missing details.'],
    exampleTitle: 'Minimal on-the-spot version',
    example: `Great meeting you today.

#wpnetwork`
  },
  {
    title: '3. Reply in an existing thread',
    bestFor: 'You already have an email thread and want the app to remember the relationship.',
    happens: 'The message/thread becomes an Intake Queue item. Name and email can be inferred from the thread when available; extra context helps but is not required.',
    steps: ['Reply normally.', 'Add #wpnetwork.', 'Optionally add one sentence of context.'],
    exampleTitle: 'Thread reply with one sentence',
    example: `Great meeting you today — let’s stay close.

#wpnetwork
Interested in late-stage venture deal flow.`
  },
  {
    title: '4. Forward an email to yourself — clean external email',
    bestFor: 'You do not want the outside person to see the trigger or internal context.',
    happens: 'Send the clean external email first. Then forward it to yourself with #wpnetwork and any private notes.',
    steps: ['Send the external email without #wpnetwork.', 'Forward the thread to your own West Peek email.', 'Put #wpnetwork and your private context at the top.'],
    exampleTitle: 'Forward-to-self private capture',
    example: `To: scooter@westpeek.ventures
Subject: Fwd: Great meeting you

#wpnetwork
Good LP/family-office relationship. Follow up this week.

---------- Forwarded message ---------`
  },
  {
    title: '5. Send yourself a standalone note',
    bestFor: 'A hallway conversation, dinner intro, phone call, text thread, or memory you do not want to lose.',
    happens: 'The note becomes an Intake Queue item even if it is incomplete.',
    steps: ['Email yourself from your West Peek account.', 'Put #wpnetwork at the top.', 'Write whatever context you remember.'],
    exampleTitle: 'Standalone note to self',
    example: `#wpnetwork
Met Sarah Lee at dinner. Horizon Capital. Strong LP conversation. Follow up next week.`
  },
  {
    title: '6. Upload a business card or screenshot',
    bestFor: 'You have a card, badge, Notes screenshot, or a screenshot of names/context.',
    happens: 'The app accepts JPG, PNG, WEBP, GIF, and iPhone HEIC/HEIF. HEIC/HEIF is normalized in the browser when the browser can decode it. Claude vision extracts fields into an Intake Queue draft.',
    steps: ['Open Cards / Screenshots / Voice.', 'Upload the image.', 'Add one optional context sentence.', 'Review the extracted draft before adding it.'],
    exampleTitle: 'Card context note',
    example: `Met at the conference. Interested in secondaries. Scooter owns.`
  },
  {
    title: '7. Upload a voice note',
    bestFor: 'You are walking out of a meeting, dinner, or conference and can say the context faster than typing it.',
    happens: 'Google Speech-to-Text transcribes the audio, then Claude structures it into a pending Intake Queue item.',
    steps: ['Record an iPhone Voice Memo or audio note.', 'Upload M4A, MP3, WAV, WEBM, MP4 audio, or AAC.', 'Review the transcript/extracted fields.'],
    exampleTitle: 'Voice note content',
    example: `Met Jordan from Apex at the conference. Family office. Interested in late-stage OpenAI and Anthropic secondaries. Scooter should follow up next week.`
  },
  {
    title: '8. Send a thank-you card / relationship touch',
    bestFor: 'Someone helped West Peek, made an intro, gave time, opened a door, or deserves a thoughtful touch.',
    happens: 'The Thank-You Card Studio drafts a WP-branded virtual card and saves a pending relationship touch. Nothing sends automatically.',
    steps: ['Open Thank-You Cards.', 'Enter recipient and reason.', 'Preview/copy the WP-branded card.', 'Open an email draft or save the touch for approval.'],
    exampleTitle: 'Thank-you reason',
    example: `Jordan Miles helped West Peek with a valuable intro. Send a thoughtful thank-you this week.`
  }
];

const examples = [

  {
    title: 'Manual Add Person founder / deal-flow fields',
    use: 'Use Add Person when you are manually entering a founder, operator, investor, or prospective deal-flow contact without using an email hashtag.',
    body: `Add Person fields to use:
Person Type: Founder
Deal-flow Prospect: Yes
Relationship Type: Founder
Dealflow Relevance: Raising, traction, deck, company signal, or deal context.
Founder Relevance: How West Peek knows the founder and what the next human review step should be.`
  },
  {
    title: 'Minimal — on the spot',
    use: 'Use when speed matters. The system should still capture name/email from Gmail if available.',
    body: `Great meeting you today.

#wpnetwork`
  },
  {
    title: 'Short context — still fast',
    use: 'Use when you can add one sentence without breaking the moment.',
    body: `#wpnetwork
Met at the conference. Interested in secondaries.`
  },
  {
    title: 'Fast actionable — enough context to act',
    use: 'Use when you know the next move.',
    body: `#wpnetwork
Jordan Miles — helped us with an intro. Scooter owns. Send thank-you card this week.`
  },
  {
    title: 'Founder / prospective deal flow',
    use: 'Use when Scooter or Sequoia receives founder outreach that should become lightweight deal flow.',
    body: `#wpdealflow\nName: Andrey Botnev\nEmail: ab@wizium.ai\nCompany: Wizium\nContext: Building AI orchestration for marketplace sellers. $144K ARR, +70% MoM, 200 customers. Raising $1.5M Pre-Seed with $900K committed. Deck included.`
  },
  {
    title: 'Structured — cleanest for review',
    use: 'Use when you have details and want the cleanest Intake Queue item.',
    body: `#wpnetwork
Name: Jordan Miles
Company: Apex Family Office
Email: jordan@example.com
Context: Helped us with an intro.
Owner: Scooter
Needs Touch: Yes
Touch: Handwritten note
Priority: High
Due: This week`
  }
];

export function Instructions() {
  return <>
    <Header eyebrow="How to Add People" title="Capture people the way they actually show up." subtitle="Event form links, conference email, reply thread, forwarded email, notes, cards, screenshots, voice notes, and thank-you touches all land in review first. Capture can be partial; enrichment comes later." />

    <div className="grid cols-2">
      <div className="card">
        <h2>Canonical trigger</h2>
        <p className="metric">#wpnetwork</p>
        <p>Put <strong>#wpnetwork</strong> anywhere in a Gmail message or note when you want relationship context captured. Use <strong>#wpdealflow</strong> or <strong>#dealflow</strong> when a founder should be classified as prospective deal flow.</p>
        <p className="muted">Relationship aliases: #addtowestpeek, #westpeeknetwork. Deal-flow alias: #dealflow.</p>
      </div>
      <div className="card">
        <h2>Capture first, complete later</h2>
        <ol>
          <li>Name only is okay.</li>
          <li>Email only is okay.</li>
          <li>Photo only is okay.</li>
          <li>Voice note only is okay.</li>
          <li>Everything goes to Intake Queue before becoming final.</li>
        </ol>
      </div>
    </div>

    <Section title="Quick decision guide">
      <div className="table-like">
        <div><strong>Hosting or attending an event?</strong><span>Create an Event, copy the public form link, and let attendees enter their own details.</span></div>
        <div><strong>Standing with the person?</strong><span>Email them normally and add #wpnetwork. Minimal is fine.</span></div>
        <div><strong>Founder deal flow?</strong><span>Forward or tag the email with #wpdealflow or #dealflow. The system marks founder + Deal-flow prospect for review.</span></div>
        <div><strong>Want the outside email clean?</strong><span>Send clean first, then forward the thread to yourself with #wpnetwork.</span></div>
        <div><strong>Have a business card?</strong><span>Upload the card/screenshot for OCR.</span></div>
        <div><strong>Have a Notes screenshot?</strong><span>Upload it as a notes_screenshot capture.</span></div>
        <div><strong>Too much to type?</strong><span>Upload a voice note and let transcription structure it.</span></div>
        <div><strong>Need to thank someone?</strong><span>Use Thank-You Cards to draft a WP-branded card/touch.</span></div>
        <div><strong>Need event context?</strong><span>Use the Events dashboard private context form or Capture Studio tied to the event.</span></div>
      </div>
    </Section>

    <Section title="Routes to add someone">
      <div className="examples route-list">{routes.map((route) => <RouteCard key={route.title} {...route} />)}</div>
    </Section>

    <Section title="Examples by detail level">
      <div className="notice"><strong>Minimal</strong> is the on-the-spot default. <strong>Fast actionable</strong> adds enough context for follow-up. <strong>Structured</strong> is optional, not required. Any field can be missing; the system uses whatever is present and sends the rest to human review.</div>
      <div className="examples">{examples.map((example) => <Example key={example.title} title={example.title} body={example.body} use={example.use} />)}</div>
    </Section>

    <Section title="What AI can help with">
      <pre>{`AI may suggest:
- OCR extraction from business cards and screenshots
- event form submission grouping
- voice-note transcript structuring
- cleaned-up context summary
- relationship type
- owner
- tags
- touch type
- follow-up date
- WP-branded thank-you card draft
- duplicate warning`}</pre>
    </Section>

    <Section title="What requires approval">
      <pre>{`Human approval is required before:
- sending emails
- sending virtual thank-you cards
- submitting handwritten notes
- ordering gifts
- merging contacts
- deleting contacts
- changing ownership`}</pre>
    </Section>
  </>;
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return <section className="card" style={{ marginTop: 16 }}><h2>{title}</h2>{children}</section>;
}

function RouteCard({ title, bestFor, happens, steps, exampleTitle, example }: { title: string; bestFor: string; happens: string; steps: string[]; exampleTitle: string; example: string }) {
  return <article className="route-card">
    <h3>{title}</h3>
    <p><strong>Best for:</strong> {bestFor}</p>
    <p><strong>What happens:</strong> {happens}</p>
    <ol>{steps.map((step) => <li key={step}>{step}</li>)}</ol>
    <Example title={exampleTitle} body={example} />
  </article>;
}

function Example({ title, body, use }: { title: string; body: string; use?: string }) {
  return <div><p className="code-title">{title}</p>{use && <p className="muted">{use}</p>}<pre>{body}</pre></div>;
}
