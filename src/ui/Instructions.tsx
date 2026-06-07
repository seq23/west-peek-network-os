import { Header } from './App';

const examples = [
  ['Fast version', `#wpnetwork\nMike MacCombie — helped us with an intro. Send thank-you this week.`],
  ['Structured version', `#wpnetwork\nName: Mike MacCombie\nCompany: MacCombie Group\nContext: Helped us with an intro.\nOwner: Scooter\nTouch: Handwritten note\nPriority: High\nDue: This week`],
  ['Minimal version', `#wpnetwork\nGreat contact from today’s event. Follow up next week.`],
  ['Relationship Touch version', `#wpnetwork\nName: Sarah Lee\nCompany: Horizon Capital\nContext: Good LP conversation at dinner.\nOwner: Sequoia\nNeeds Touch: Yes\nTouch: Email\nPriority: Normal\nDue: Next week`],
  ['Intro follow-up version', `#wpnetwork\nName: David Chen\nCompany: Northstar Ventures\nContext: Offered to introduce us to a family office buyer.\nOwner: Scooter\nNeeds Touch: Yes\nTouch: Intro follow-up\nPriority: High\nDue: This week`],
  ['Gift / handwritten note version', `#wpnetwork\nName: Mike MacCombie\nContext: Helped us with a valuable intro.\nNeeds Touch: Yes\nTouch: Handwritten note or gift\nPriority: High\nDue: This week`]
];

const liveExamples = [
  ['Simple P.S. capture', `Subject: Great meeting you today\n\nMike,\n\nGreat meeting you today — really enjoyed the conversation. Looking forward to staying in touch.\n\nBest,\nScooter\n\nP.S. #wpnetwork`],
  ['Natural context note', `Subject: Great meeting you today\n\nMike,\n\nGreat meeting you today. I appreciated the conversation and the intro you offered to make. We would love to stay close.\n\nBest,\nScooter\n\n#wpnetwork`],
  ['Internal capture block below signature', `Subject: Great meeting you today\n\nMike,\n\nGreat meeting you today. Really appreciated the conversation and would love to stay close.\n\nBest,\nScooter\n\n--\nInternal West Peek note:\n#wpnetwork\nContext: Met at the event today. Helpful conversation. Possible strategic relationship.\nOwner: Scooter\nNeeds Touch: Yes\nTouch: Email or handwritten note\nPriority: Normal\nDue: Next week`],
  ['Clean external email + internal capture note', `External email:\n\nSubject: Great meeting you\n\nMike,\n\nGreat meeting you today. Really enjoyed the conversation and appreciate you thinking of West Peek.\n\nBest,\nScooter\n\nInternal capture after sending:\n\n#wpnetwork\nName: Mike MacCombie\nContext: Met today. Helped with an intro. Should get thoughtful thank-you.\nOwner: Scooter\nNeeds Touch: Yes\nTouch: Handwritten note\nPriority: High\nDue: This week`],
  ['Live email, visible trigger', `Subject: Great meeting you

Sarah,

Great meeting you today — really enjoyed learning more about what you’re building. Let’s stay close.

Best,
Sequoia

#wpnetwork`],
  ['Live email with touch cue', `Subject: Great meeting you\n\nMike,\n\nGreat meeting you today. Really appreciate the intro you offered to make — that was generous of you.\n\nBest,\nScooter\n\n#wpnetwork\nNeeds Touch: Yes\nTouch: Handwritten note\nPriority: High\nDue: This week`],
  ['In-the-moment minimal version', `#wpnetwork\nMet Mike at lunch. Helpful intro. Add to West Peek Network. Scooter owns. Touch this week.`],
  ['In-the-moment structured version', `#wpnetwork\nName: Mike MacCombie\nCompany: MacCombie Group\nContext: Met at lunch. Helpful intro. Good strategic relationship.\nOwner: Scooter\nNeeds Touch: Yes\nTouch: Handwritten note\nPriority: High\nDue: This week`]
];

export function Instructions() {
  return <>
    <Header eyebrow="How to Add People" title="Add people to the West Peek Network." subtitle="Use manual add, Gmail capture, or in-the-moment email capture. Everything routes to Intake Queue first unless you manually save a person inside the app." />
    <div className="grid cols-2">
      <div className="card"><h2>Canonical trigger</h2><p className="metric">#wpnetwork</p><p>Use <strong>#wpnetwork</strong> whenever you want an email or note captured for the West Peek Network.</p><p className="muted">Accepted aliases: #addtowestpeek, #westpeeknetwork.</p></div>
      <div className="card"><h2>What happens next</h2><ol><li>Email contains #wpnetwork.</li><li>Network OS captures it.</li><li>AI suggests name, company, context, tags, owner, and touch.</li><li>Item appears in Intake Queue.</li><li>Human clicks “Add to West Peek Network” or “Attach to Existing Person.”</li></ol></div>
    </div>
    <Section title="Add someone manually">
      <pre>{`1. Click “+ Add to West Peek Network.”\n2. Add the person’s name.\n3. Add email/company if known.\n4. Add context.\n5. Choose owner.\n6. Mark Needs Touch if relevant.\n7. Save.`}</pre>
      <Example title="Manual entry example" body={`Name: Mike MacCombie\nCompany: MacCombie Group\nContext: Helped West Peek with an intro and should receive a thoughtful thank-you.\nOwner: Scooter\nNeeds Touch: Yes\nType of Touch: Handwritten note\nPriority: High\nDue: This week`} />
    </Section>
    <Section title="Add from Gmail">
      <div className="notice">Using the trigger creates an Intake Queue item. It does not automatically add the person until someone reviews it.</div>
      <div className="examples">{examples.map(([title, body]) => <Example key={title} title={title} body={body} />)}</div>
    </Section>
    <Section title="Add someone while emailing them">
      <div className="notice">If you do not mind the contact seeing #wpnetwork, use the trigger in the live email. If you want the email cleaner, send the normal email first, then forward or reply to yourself with #wpnetwork and context.</div>
      <div className="examples">{liveExamples.map(([title, body]) => <Example key={title} title={title} body={body} />)}</div>
    </Section>
    <Section title="What AI can help with">
      <pre>{`AI may suggest:\n- cleaned-up context summary\n- relationship type\n- owner\n- tags\n- touch type\n- follow-up date\n- handwritten note draft\n- email thank-you draft\n- duplicate warning`}</pre>
    </Section>
    <Section title="What requires approval">
      <pre>{`Human approval is required before:\n- sending emails\n- submitting handwritten notes\n- ordering gifts\n- merging contacts\n- deleting contacts\n- changing ownership`}</pre>
    </Section>
    <Section title="Approval notifications">
      <pre>{`Network OS may notify you when approval is waiting.\n\nNotifications are reminders, not approvals.\n\nClicking a notification opens the authenticated approval page. It does not approve the action directly.\n\nHigh-priority relationship touches, handwritten notes, gifts, and execution failures can trigger immediate notification. Normal approvals belong in the daily digest.`}</pre>
    </Section>
  </>;
}
function Section({ title, children }: { title: string; children: React.ReactNode }) { return <section className="card" style={{ marginTop: 16 }}><h2>{title}</h2>{children}</section>; }
function Example({ title, body }: { title: string; body: string }) { return <div><p className="code-title">{title}</p><pre>{body}</pre></div>; }
