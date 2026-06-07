import { useState } from 'react';
import type { ContactRecord, Owner, TouchMethod } from '../domain/types';
import { quickAddSchema } from '../domain/schema';
import { createStableId } from '../domain/ids';
import { Header } from './App';

export function AddPerson({ onAdded }: { onAdded: (record: ContactRecord, touchMethod: TouchMethod) => void }) {
  const [error, setError] = useState<string | null>(null);
  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const input = {
      full_name: String(form.get('full_name') || ''),
      email: String(form.get('email') || ''),
      company: String(form.get('company') || ''),
      context_summary: String(form.get('context_summary') || ''),
      relationship_owner: String(form.get('relationship_owner') || 'Unassigned') as Owner,
      touch_needed: form.get('touch_needed') === 'on',
      touch_method: String(form.get('touch_method') || 'undecided') as TouchMethod,
      priority: String(form.get('priority') || 'Normal') as 'Low' | 'Normal' | 'High',
      due_date: String(form.get('due_date') || ''),
      tags: String(form.get('tags') || '')
    };
    const parsed = quickAddSchema.safeParse(input);
    if (!parsed.success) {
      setError(parsed.error.issues.map((issue) => issue.message).join(', '));
      return;
    }
    const now = new Date().toISOString();
    onAdded({
      contact_id: createStableId('contact'),
      created_at: now,
      updated_at: now,
      status: 'active',
      full_name: input.full_name,
      email: input.email || undefined,
      company: input.company || undefined,
      relationship_owner: input.relationship_owner,
      priority: input.priority,
      tags: input.tags ? input.tags.split(',').map((tag) => tag.trim()).filter(Boolean) : [],
      context_summary: input.context_summary,
      touch_needed: input.touch_needed,
      touch_status: input.touch_needed ? 'needed' : undefined,
      next_follow_up_date: input.due_date || undefined,
      created_by: 'local-baseline-user',
      updated_by: 'local-baseline-user'
    }, input.touch_method);
  }
  return <>
    <Header eyebrow="Manual add" title="Add to West Peek Network" subtitle="Fast capture for someone you met, someone who helped, or someone West Peek should remember." />
    <form className="card form" onSubmit={submit}>
      {error && <div className="notice">{error}</div>}
      <div className="grid cols-2">
        <Field label="Name"><input name="full_name" placeholder="Mike MacCombie" required /></Field>
        <Field label="Email, if known"><input name="email" type="email" placeholder="mike@example.com" /></Field>
        <Field label="Company, if known"><input name="company" placeholder="MacCombie Group" /></Field>
        <Field label="Owner"><select name="relationship_owner" defaultValue="Unassigned"><option>Sequoia</option><option>Scooter</option><option>Unassigned</option></select></Field>
      </div>
      <Field label="Context"><textarea name="context_summary" placeholder="Helped West Peek with an intro and should receive a thoughtful thank-you." required /></Field>
      <div className="grid cols-3">
        <Field label="Needs Touch?"><label className="row"><span>Yes — create a Relationship Touch</span><input aria-label="Needs Touch" name="touch_needed" type="checkbox" /></label></Field>
        <Field label="Type of Touch, if obvious"><select name="touch_method" defaultValue="undecided"><option value="undecided">Undecided</option><option value="email">Email</option><option value="handwritten_note">Handwritten note</option><option value="gift">Gift</option><option value="intro">Intro</option><option value="call">Call</option><option value="meeting">Meeting</option><option value="event_invite">Event invite</option><option value="other">Other</option></select></Field>
        <Field label="Priority"><select name="priority" defaultValue="Normal"><option>Low</option><option>Normal</option><option>High</option></select></Field>
      </div>
      <div className="grid cols-2">
        <Field label="Due"><input name="due_date" placeholder="This week / Next week / Pick date" /></Field>
        <Field label="Tags"><input name="tags" placeholder="Warm intro, Friend of firm" /></Field>
      </div>
      <button className="btn primary" type="submit">Add to West Peek Network</button>
    </form>
  </>;
}
function Field({ label, children }: { label: string; children: React.ReactNode }) { return <div className="field"><label>{label}</label>{children}</div>; }
