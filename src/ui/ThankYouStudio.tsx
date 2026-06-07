import { useMemo, useState } from 'react';
import { Header } from './App';

export function ThankYouStudio({ onSaved }: { onSaved?: () => void }) {
  const [recipient, setRecipient] = useState('Mike MacCombie');
  const [reason, setReason] = useState('Thank you for helping West Peek with a valuable intro.');
  const [fromName, setFromName] = useState('West Peek');
  const [message, setMessage] = useState('Thank you for the time, insight, and support you shared with West Peek. Relationships like this matter to us, and we wanted to send a small note of gratitude.');
  const [result, setResult] = useState('No thank-you card has been saved in this browser session.');
  const [busy, setBusy] = useState(false);

  const mailto = useMemo(() => {
    const subject = encodeURIComponent(`Thank you from West Peek`);
    const body = encodeURIComponent(`${recipient ? `${recipient},\n\n` : ''}${message}\n\n— ${fromName || 'West Peek'}`);
    return `mailto:?subject=${subject}&body=${body}`;
  }, [recipient, message, fromName]);

  async function createDraft(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setResult('Calling /api/touches/thank-you/create...');
    const form = new FormData(event.currentTarget);
    try {
      const response = await fetch('/api/touches/thank-you/create', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(Object.fromEntries(form.entries()))
      });
      const payload = await response.json();
      if (!response.ok || payload?.ok === false) throw new Error(payload?.error || 'Thank-you card creation failed.');
      if (payload?.draft?.card_message) setMessage(payload.draft.card_message);
      setResult(JSON.stringify(payload, null, 2));
      onSaved?.();
    } catch (error) {
      setResult(error instanceof Error ? error.message : 'Thank-you card creation failed.');
    } finally {
      setBusy(false);
    }
  }

  return <>
    <Header eyebrow="Thank-You Card Studio" title="Create a West Peek branded thank-you" subtitle="Draft a virtual card, save it as a relationship touch, and keep approval/send manual. Nothing sends automatically." />
    <div className="grid cols-2">
      <form className="card form" onSubmit={createDraft}>
        <h2>Create thank-you touch</h2>
        <Field label="Recipient name"><input name="recipient_name" value={recipient} onChange={(event) => setRecipient(event.target.value)} required /></Field>
        <Field label="Recipient email, if known"><input name="recipient_email" type="email" placeholder="mike@example.com" /></Field>
        <Field label="Company"><input name="company" placeholder="MacCombie Group" /></Field>
        <Field label="Reason"><textarea name="reason" value={reason} onChange={(event) => setReason(event.target.value)} required /></Field>
        <div className="grid cols-2">
          <Field label="From"><select name="from_name" value={fromName} onChange={(event) => setFromName(event.target.value)}><option>West Peek</option><option>Sequoia</option><option>Scooter</option></select></Field>
          <Field label="Tone"><select name="tone" defaultValue="warm polished"><option value="warm polished">Warm polished</option><option value="investor formal">Investor formal</option><option value="founder friendly">Founder friendly</option><option value="short handwritten">Short handwritten</option></select></Field>
        </div>
        <div className="grid cols-2">
          <Field label="Owner"><select name="owner" defaultValue="Unassigned"><option>Sequoia</option><option>Scooter</option><option>Unassigned</option></select></Field>
          <Field label="Due"><input name="due_date" placeholder="This week" /></Field>
        </div>
        <button className="btn primary" disabled={busy} type="submit">Draft + save thank-you touch</button>
      </form>
      <div className="card">
        <h2>WP branded card preview</h2>
        <div className="thank-card">
          <div className="thank-card-mark"><img src="/wp-logo.jpg" alt="West Peek" /></div>
          <div className="thank-card-kicker">West Peek</div>
          <h3>Thank you{recipient ? `, ${recipient.split(' ')[0]}` : ''}.</h3>
          <p>{message}</p>
          <div className="thank-card-signature">— {fromName || 'West Peek'}</div>
        </div>
        <div className="actions" style={{ marginTop: 12 }}>
          <button className="btn" type="button" onClick={() => navigator.clipboard?.writeText(`${message}\n\n— ${fromName || 'West Peek'}`)}>Copy card copy</button>
          <a className="btn primary" href={mailto}>Open email draft</a>
        </div>
        <p className="muted">Email draft is click-to-open only. The app does not silently send cards, emails, gifts, or vendor orders.</p>
      </div>
    </div>
    <div className="card" style={{ marginTop: 16 }}><h2>Internal data trace</h2><pre>{result}</pre></div>
  </>;
}

function Field({ label, children }: { label: string; children: React.ReactNode }) { return <div className="field"><label>{label}</label>{children}</div>; }
