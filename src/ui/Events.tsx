import { useMemo, useState } from 'react';
import { Header } from './App';
import { createSheetEvent, createSheetEventContext } from '../services/sheetsClient';
import type { EventAttendeeRecord, EventRecord } from '../domain/types';

type Props = {
  events: EventRecord[];
  attendees: EventAttendeeRecord[];
  onSaved?: (message?: string) => void;
};

export function EventsPage({ events, attendees, onSaved }: Props) {
  const activeEvents = events.filter((event) => event.status === 'active');
  const [selectedId, setSelectedId] = useState(activeEvents[0]?.event_id || events[0]?.event_id || '');
  const [status, setStatus] = useState('Create an event, copy the public form link, and let people enter their own details.');
  const selected = useMemo(() => events.find((event) => event.event_id === selectedId) || events[0], [events, selectedId]);
  const selectedAttendees = selected ? attendees.filter((row) => row.event_id === selected.event_id) : [];
  const publicLink = selected ? absoluteEventLink(selected) : '';

  async function createEvent(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    setStatus('Creating event...');
    try {
      const payload = await createSheetEvent({
        event_name: String(form.get('event_name') || ''),
        event_date: String(form.get('event_date') || ''),
        location: String(form.get('location') || ''),
        owner_email: String(form.get('owner_email') || ''),
        notes: String(form.get('notes') || ''),
        public_form_enabled: true
      });
      setSelectedId(payload.event.event_id);
      setStatus(`Created ${payload.event.event_name}. Public form: ${absoluteEventLink(payload.event)}`);
      formElement.reset();
      onSaved?.('Event created in Google Sheets.');
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'Could not create event.');
    }
  }

  async function addPrivateContext(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selected) return;
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    setStatus('Adding private event context...');
    try {
      await createSheetEventContext({
        event_id: selected.event_id,
        public_name: String(form.get('public_name') || ''),
        public_email: String(form.get('public_email') || ''),
        public_company: String(form.get('public_company') || ''),
        public_title: String(form.get('public_title') || ''),
        private_context: String(form.get('private_context') || ''),
        source_type: 'event_private_note'
      });
      setStatus('Private context added to the event and Intake Queue.');
      formElement.reset();
      onSaved?.('Event context saved to Google Sheets.');
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'Could not add private event context.');
    }
  }

  async function copyLink() {
    if (!publicLink) return;
    await navigator.clipboard?.writeText(publicLink);
    setStatus('Public event form link copied.');
  }

  return <>
    <Header eyebrow="Event Capture" title="Create event forms and review attendees" subtitle="Thin layer over Intake Queue: public forms collect details, operators enrich privately, and everything remains pending human review." />
    <div className="notice" style={{ marginBottom: 16 }}>{status}</div>
    <div className="grid cols-2">
      <form className="card form" onSubmit={createEvent}>
        <h2>Create event</h2>
        <p className="muted">Use this for Tech Week, Pre-Seed Summit, GP Wine Night, dinners, salons, conferences, and quick rooms where people should enter their own details.</p>
        <Field label="Event name"><input name="event_name" placeholder="GP Wine Night" required /></Field>
        <div className="grid cols-2"><Field label="Date"><input name="event_date" placeholder="Tonight / 2026-06-07" /></Field><Field label="Location"><input name="location" placeholder="Memphis / NYC / Tech Week" /></Field></div>
        <Field label="Owner email"><input name="owner_email" type="email" placeholder="scooter@westpeek.ventures" /></Field>
        <Field label="Event notes"><textarea name="notes" placeholder="Who is in the room? What is the goal?" /></Field>
        <button className="btn primary" type="submit">Create event + form link</button>
      </form>

      <div className="card">
        <h2>Selected event</h2>
        {events.length ? <>
          <Field label="Choose event"><select value={selected?.event_id || ''} onChange={(event) => setSelectedId(event.target.value)}>{events.map((event) => <option key={event.event_id} value={event.event_id}>{event.event_name} — {event.status}</option>)}</select></Field>
          {selected && <>
            <p><strong>{selected.event_name}</strong></p>
            <p className="muted">{selected.location || 'No location'} • {selected.event_date || 'No date'} • Owner: {selected.owner_email}</p>
            <p><a href={publicLink} target="_blank" rel="noopener noreferrer">{publicLink}</a></p>
            <div className="actions"><button className="btn primary" type="button" onClick={copyLink}>Copy public form link</button><a className="btn" href={publicLink} target="_blank" rel="noopener noreferrer">Open public form</a></div>
            <p className="muted">Public form collects name, email, company, title, LinkedIn, interest, and follow-up consent. No public uploads. No automatic contact creation.</p>
          </>}
        </> : <p>No events yet. Create one to generate a public attendee form link.</p>}
      </div>
    </div>

    {selected && <div className="grid cols-2" style={{ marginTop: 16 }}>
      <form className="card form" onSubmit={addPrivateContext}>
        <h2>Add private context</h2>
        <p className="muted">Use this after someone fills out the public form or when Scooter remembers context on the fly. This creates an event attendee row and a pending Intake Queue item.</p>
        <div className="grid cols-2"><Field label="Name"><input name="public_name" placeholder="Jordan Miles" /></Field><Field label="Email"><input name="public_email" type="email" placeholder="jordan@example.com" /></Field></div>
        <div className="grid cols-2"><Field label="Company"><input name="public_company" placeholder="Apex Family Office" /></Field><Field label="Title"><input name="public_title" placeholder="Partner" /></Field></div>
        <Field label="Private context"><textarea name="private_context" placeholder="Met at GP Wine Night. Interested in late-stage secondaries. Send thank-you or follow up next week." /></Field>
        <button className="btn primary" type="submit">Save private context to event</button>
      </form>
      <div className="card">
        <h2>Attendees for {selected.event_name}</h2>
        <p className="muted">{selectedAttendees.length} attendee/intake records tied to this event.</p>
        <div className="list compact-list">{selectedAttendees.map((person) => <div className="mini-card" key={person.event_attendee_id}>
          <strong>{person.public_name || person.public_email || 'Unnamed attendee'}</strong>
          <span>{person.public_company || 'No company'} • {person.source_type}</span>
          <span>{person.review_status} • missing: {person.missing_fields || 'none'}</span>
          {(person.public_interest || person.private_context || person.ai_summary) && <p>{person.private_context || person.public_interest || person.ai_summary}</p>}
        </div>)}</div>
        <p className="muted" style={{ marginTop: 12 }}>For card/photo or voice enrichment, use Capture Studio and choose this event. Those uploads stay internal and pending review.</p>
      </div>
    </div>}
  </>;
}

function absoluteEventLink(event: EventRecord) {
  const slug = event.event_slug || event.public_form_url?.replace(/^\/e\//, '') || '';
  if (typeof window === 'undefined') return `/e/${slug}`;
  return `${window.location.origin}/e/${slug}`;
}

function Field({ label, children }: { label: string; children: React.ReactNode }) { return <div className="field"><label>{label}</label>{children}</div>; }
