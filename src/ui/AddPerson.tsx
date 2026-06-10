import { useState } from 'react';
import type { ContactRecord, DealFlowProspect, Owner, PersonType, TouchMethod } from '../domain/types';
import { quickAddSchema } from '../domain/schema';
import { createStableId } from '../domain/ids';
import { Header } from './App';

export function AddPerson({ onAdded }: { onAdded: (record: ContactRecord, touchMethod: TouchMethod) => void }) {
  const [error, setError] = useState<string | null>(null);

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const rawName = String(form.get('full_name') || '').trim();
    const rawEmail = String(form.get('email') || '').trim();
    const rawCompany = String(form.get('company') || '').trim();
    const rawContext = String(form.get('context_summary') || '').trim();
    const personType = String(form.get('person_type') || 'unknown') as PersonType;
    const dealFlowProspect = String(form.get('deal_flow_prospect') || 'unknown') as DealFlowProspect;
    const relationshipType = String(form.get('relationship_type') || '').trim() || (personType === 'founder' ? 'Founder' : '');
    const dealflowRelevance = String(form.get('dealflow_relevance') || '').trim();
    const founderRelevance = String(form.get('founder_relevance') || '').trim();

    const tagSet = new Set(
      String(form.get('tags') || '')
        .split(',')
        .map((tag) => tag.trim())
        .filter(Boolean)
    );
    if (personType === 'founder') tagSet.add('Founder');
    if (dealFlowProspect === 'yes') tagSet.add('Prospective Deal Flow');

    const input = {
      full_name: rawName || rawEmail || rawCompany || 'Unnamed relationship',
      email: rawEmail,
      company: rawCompany,
      person_type: personType,
      deal_flow_prospect: dealFlowProspect,
      relationship_type: relationshipType,
      context_summary: rawContext || `Captured with partial details: ${[rawName, rawEmail, rawCompany].filter(Boolean).join(' • ') || 'no structured fields yet'}. Enrich in review later.`,
      dealflow_relevance: dealflowRelevance,
      founder_relevance: founderRelevance,
      relationship_owner: String(form.get('relationship_owner') || 'Unassigned') as Owner,
      touch_needed: form.get('touch_needed') === 'on',
      touch_method: String(form.get('touch_method') || 'undecided') as TouchMethod,
      priority: String(form.get('priority') || 'Normal') as 'Low' | 'Normal' | 'High',
      due_date: String(form.get('due_date') || ''),
      tags: Array.from(tagSet).join(', ')
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
      person_type: input.person_type,
      deal_flow_prospect: input.deal_flow_prospect,
      relationship_type: input.relationship_type || undefined,
      relationship_owner: input.relationship_owner,
      priority: input.priority,
      tags: input.tags ? input.tags.split(',').map((tag) => tag.trim()).filter(Boolean) : [],
      context_summary: input.context_summary,
      dealflow_relevance: input.dealflow_relevance || undefined,
      founder_relevance: input.founder_relevance || undefined,
      touch_needed: input.touch_needed,
      touch_status: input.touch_needed ? 'needed' : undefined,
      next_follow_up_date: input.due_date || undefined,
      created_by: 'local-baseline-user',
      updated_by: 'local-baseline-user'
    }, input.touch_method);
  }

  return <>
    <Header eyebrow="Manual add" title="Add to West Peek Network" subtitle="Flexible capture for someone West Peek should remember. For founders or prospective deal flow, mark Person Type and Deal-flow Prospect directly here." />
    <form className="card form" onSubmit={submit}>
      {error && <div className="notice">{error}</div>}
      <div className="grid cols-2">
        <Field label="Name, if known"><input name="full_name" placeholder="Jordan Miles" /></Field>
        <Field label="Email, if known"><input name="email" type="email" placeholder="jordan@example.com" /></Field>
        <Field label="Company, if known"><input name="company" placeholder="Apex Family Office" /></Field>
        <Field label="Owner"><select name="relationship_owner" defaultValue="Unassigned"><option>Sequoia</option><option>Scooter</option><option>Unassigned</option></select></Field>
      </div>
      <div className="grid cols-3">
        <Field label="Person Type"><p className="muted">Use Founder for people who may send, raise, or represent deal flow.</p><select name="person_type" defaultValue="unknown"><option value="unknown">Unknown</option><option value="investor">Investor</option><option value="founder">Founder</option><option value="operator">Operator</option><option value="lawyer">Lawyer</option><option value="service_provider">Service Provider</option><option value="media">Media</option><option value="general">General</option></select></Field>
        <Field label="Deal-flow Prospect"><p className="muted">Use Yes when this person should be tracked as prospective deal flow.</p><select name="deal_flow_prospect" defaultValue="unknown"><option value="unknown">Unknown</option><option value="yes">Yes</option><option value="no">No</option></select></Field>
        <Field label="Relationship Type"><input name="relationship_type" placeholder="Founder / LP / Operator / Friend of firm" /></Field>
      </div>
      <Field label="Context, if known"><textarea name="context_summary" placeholder="Optional: helped West Peek with an intro and should receive a thoughtful thank-you." /></Field>
      <div className="grid cols-2">
        <Field label="Dealflow Relevance"><input name="dealflow_relevance" placeholder="Prospective deal flow, raise context, traction, deck, or company signal." /></Field>
        <Field label="Founder Relevance"><input name="founder_relevance" placeholder="Founder relationship context, company, ask, or meeting history." /></Field>
      </div>
      <div className="grid cols-3">
        <Field label="Needs Touch?"><label className="row"><span>Yes — create a Relationship Touch</span><input aria-label="Needs Touch" name="touch_needed" type="checkbox" /></label></Field>
        <Field label="Type of Touch, if obvious"><select name="touch_method" defaultValue="undecided"><option value="undecided">Undecided</option><option value="email">Email</option><option value="handwritten_note">Handwritten note</option><option value="virtual_thank_you_card">Virtual thank-you card</option><option value="gift">Gift</option><option value="intro">Intro</option><option value="call">Call</option><option value="meeting">Meeting</option><option value="event_invite">Event invite</option><option value="other">Other</option></select></Field>
        <Field label="Priority"><select name="priority" defaultValue="Normal"><option>Low</option><option>Normal</option><option>High</option></select></Field>
      </div>
      <div className="grid cols-2">
        <Field label="Due"><input name="due_date" placeholder="This week / Next week / Pick date" /></Field>
        <Field label="Tags"><input name="tags" placeholder="Warm intro, Friend of firm" /></Field>
      </div>
      <p className="muted">Founder + Deal-flow Prospect automatically adds Founder and Prospective Deal Flow tags. Email trigger equivalent: #wpdealflow or #dealflow.</p>
      <button className="btn primary" type="submit">Save person</button>
    </form>
  </>;
}
function Field({ label, children }: { label: string; children: React.ReactNode }) { return <div className="field"><label>{label}</label>{children}</div>; }
