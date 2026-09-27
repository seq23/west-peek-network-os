import { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowRight, ExternalLink, X } from 'lucide-react';
import { Header, RouteGuide } from './App';
import { clippedText, displayText } from './text';
import { friendlyWhen, humanize, relativeWhen } from './format';
import type { ContactRecord } from '../domain/types';
import { CONTACT_SORT_LABELS, NETWORK_LIST_PAGE_SIZE, filterContacts, reconcileSelection, sortContacts, stepSelection, type ContactSort, type ContactView } from '../domain/contactList';
import { clampContactPage, contactPageCount, paginateContacts } from '../domain/contactPagination';

type Props = {
  rows: ContactRecord[];
  mutationKey: string | null;
  onStatus: (id: string, status: 'active' | 'archived') => void;
};

const SORT_ORDER: ContactSort[] = ['newest', 'updated', 'name', 'company'];

export function NetworkPage({ rows, mutationKey, onStatus }: Props) {
  const [view, setView] = useState<ContactView>('active');
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState<ContactSort>('newest');
  const [requestedPage, setRequestedPage] = useState(1);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const listRef = useRef<HTMLUListElement>(null);

  const visible = useMemo(() => sortContacts(filterContacts(rows, view, search), sort), [rows, view, search, sort]);
  const pageCount = contactPageCount(visible.length, NETWORK_LIST_PAGE_SIZE);
  const currentPage = clampContactPage(requestedPage, visible.length, NETWORK_LIST_PAGE_SIZE);
  const pageRows = paginateContacts(visible, currentPage, NETWORK_LIST_PAGE_SIZE);
  const activeSelection = reconcileSelection(rows, selectedId);
  const selected = activeSelection ? rows.find((row) => row.contact_id === activeSelection) || null : null;

  useEffect(() => { if (selectedId && !activeSelection) setSelectedId(null); }, [selectedId, activeSelection]);

  function resetPage() { setRequestedPage(1); }

  function focusRow(id: string | null) {
    if (!id) return;
    const target = listRef.current?.querySelector<HTMLButtonElement>(`[data-contact-row="${id}"] button`);
    target?.focus();
  }

  function onListKeyDown(event: React.KeyboardEvent<HTMLUListElement>) {
    const ids = pageRows.map((row) => row.contact_id);
    // Step from the open record, or from the row that currently has keyboard focus when nothing is open.
    const focusedRow = (event.target as HTMLElement | null)?.closest<HTMLElement>('[data-contact-row]')?.dataset.contactRow || null;
    const anchor = activeSelection || focusedRow;
    let next: string | null | undefined;
    if (event.key === 'ArrowDown') next = stepSelection(ids, anchor, 1);
    else if (event.key === 'ArrowUp') next = stepSelection(ids, anchor, -1);
    else if (event.key === 'Home') next = ids[0] || null;
    else if (event.key === 'End') next = ids[ids.length - 1] || null;
    else if (event.key === 'Escape') { setSelectedId(null); return; }
    if (next === undefined) return;
    event.preventDefault();
    setSelectedId(next);
    focusRow(next);
  }

  const pagination = visible.length > NETWORK_LIST_PAGE_SIZE && (
    <nav className="pagination-controls" aria-label="Contact pages">
      <button className="btn small" type="button" disabled={currentPage === 1} onClick={() => setRequestedPage(currentPage - 1)}>Previous</button>
      <span>Page {currentPage} of {pageCount} · showing {pageRows.length} of {visible.length}</span>
      <button className="btn small" type="button" disabled={currentPage === pageCount} onClick={() => setRequestedPage(currentPage + 1)}>Next</button>
    </nav>
  );

  return <>
    <Header eyebrow="West Peek Network" title="People in the West Peek Network" subtitle="Newest additions appear first. Select a person to open their full record. Archived contacts stay recoverable and out of normal work surfaces." />
    <RouteGuide purpose="Find and manage finalized relationship records." primaryAction="Search, sort, and open a person to review or archive." secondary="Use the arrow keys to move through the list and Escape to close the record." caution="Intake belongs in the Intake Queue until reviewed." />
    <div className="filter-bar network-filter">
      <input aria-label="Search contacts" placeholder="Search name, email, company, title, context, or tags" value={search} onChange={(event) => { setSearch(event.target.value); resetPage(); }} />
      <div className="segmented" role="group" aria-label="Contact status view">
        <button type="button" className={view === 'active' ? 'active' : ''} onClick={() => { setView('active'); resetPage(); }}>Active</button>
        <button type="button" className={view === 'archived' ? 'active' : ''} onClick={() => { setView('archived'); resetPage(); }}>Archived</button>
        <button type="button" className={view === 'all' ? 'active' : ''} onClick={() => { setView('all'); resetPage(); }}>All</button>
      </div>
      <label className="network-sort"><span className="muted">Sort</span><select aria-label="Sort contacts" value={sort} onChange={(event) => { setSort(event.target.value as ContactSort); resetPage(); }}>{SORT_ORDER.map((key) => <option key={key} value={key}>{CONTACT_SORT_LABELS[key]}</option>)}</select></label>
      <span className="result-count">{visible.length} records</span>
    </div>
    <div className={`network-layout ${selected ? 'has-selection' : ''}`}>
      <section className="network-list-pane" aria-label="Contact list">
        {pagination}
        {visible.length === 0 ? (
          <div className="empty-state"><h3>{rows.length ? 'No contacts match this view' : 'No contacts yet'}</h3>{rows.length > 0 && <p>Change the search, status view, or sort.</p>}</div>
        ) : <>
          <div className="network-list-head" aria-hidden="true"><span>Person</span><span>Company</span><span>Owner</span><span>Signals</span><span>Added</span></div>
          <ul className="network-list" ref={listRef} onKeyDown={onListKeyDown}>
            {pageRows.map((contact) => {
              const isSelected = contact.contact_id === activeSelection;
              return (
                <li key={contact.contact_id} data-contact-row={contact.contact_id} className={`network-row ${isSelected ? 'selected' : ''} ${contact.status === 'archived' ? 'archived' : ''}`} aria-current={isSelected ? 'true' : undefined} onClick={() => setSelectedId(contact.contact_id)}>
                  <div className="network-cell network-cell-person">
                    <h3><button type="button" aria-expanded={isSelected} onClick={(event) => { event.stopPropagation(); setSelectedId(contact.contact_id); }}>{clippedText(contact.full_name, 100, 'Unnamed contact')}</button></h3>
                    <span className="network-sub">{contact.email || 'No email on file'}</span>
                  </div>
                  <div className="network-cell network-cell-company">
                    <strong>{clippedText(contact.company, 80, 'No company')}</strong>
                    {contact.title && <span className="network-sub">{clippedText(contact.title, 80)}</span>}
                  </div>
                  <div className="network-cell network-cell-owner">{contact.relationship_owner}</div>
                  <div className="network-cell network-cell-signals">
                    <span className={`badge ${contact.priority === 'High' ? 'warn' : ''}`}>{contact.priority}</span>
                    {contact.person_type && contact.person_type !== 'unknown' && <span className="badge">{humanize(contact.person_type)}</span>}
                    {contact.deal_flow_prospect === 'yes' && <span className="badge warn">Deal-flow prospect</span>}
                    {contact.touch_needed && <span className="badge warn">Needs touch</span>}
                    {contact.status === 'archived' && <span className="badge">Archived</span>}
                  </div>
                  <div className="network-cell network-cell-when"><time dateTime={contact.created_at}>{relativeWhen(contact.created_at) || '—'}</time><ArrowRight size={15} className="network-row-arrow" aria-hidden="true" /></div>
                </li>
              );
            })}
          </ul>
        </>}
        {pagination}
      </section>
      <aside className="network-detail" aria-label="Contact detail" aria-live="polite">
        {selected ? <ContactDetail contact={selected} mutationKey={mutationKey} onStatus={onStatus} onClose={() => setSelectedId(null)} /> : (
          <div className="network-detail-empty">
            <div className="kicker">Contact record</div>
            <p>Select a person to see their full record here.</p>
            <p className="muted">Arrow keys move through the list. Escape closes the record.</p>
          </div>
        )}
      </aside>
    </div>
  </>;
}

type Field = { label: string; value?: string | null; kind?: 'text' | 'link' | 'long' };
type Group = { title: string; fields: Field[] };

function ContactDetail({ contact, mutationKey, onStatus, onClose }: { contact: ContactRecord; mutationKey: string | null; onStatus: (id: string, status: 'active' | 'archived') => void; onClose: () => void }) {
  const busy = Boolean(mutationKey?.startsWith(`contact:${contact.contact_id}:`));
  const owners = [contact.relationship_owner, ...(contact.additional_owners || [])].filter(Boolean).join(', ');
  const rawGroups: Group[] = [
    { title: 'Reach', fields: [
      { label: 'Email', value: contact.email },
      { label: 'Phone', value: contact.phone },
      { label: 'LinkedIn', value: contact.linkedin_url, kind: 'link' },
      { label: 'City', value: contact.city },
      { label: 'Title', value: contact.title }
    ] },
    { title: 'Relationship', fields: [
      { label: 'Owner', value: owners },
      { label: 'Relationship type', value: contact.relationship_type && humanize(contact.relationship_type) },
      { label: 'Person type', value: contact.person_type && contact.person_type !== 'unknown' ? humanize(contact.person_type) : undefined },
      { label: 'Priority', value: contact.priority },
      { label: 'Deal-flow prospect', value: contact.deal_flow_prospect === 'yes' ? 'Yes' : undefined },
      { label: 'Warmth', value: contact.warmth && humanize(contact.warmth) },
      { label: 'Trust level', value: contact.trust_level && humanize(contact.trust_level) },
      { label: 'Strategic value', value: contact.strategic_value && humanize(contact.strategic_value) },
      { label: 'Capital relevance', value: contact.capital_relevance && humanize(contact.capital_relevance) },
      { label: 'Deal-flow relevance', value: contact.dealflow_relevance && humanize(contact.dealflow_relevance) },
      { label: 'Founder relevance', value: contact.founder_relevance && humanize(contact.founder_relevance) },
      { label: 'LP relevance', value: contact.lp_relevance && humanize(contact.lp_relevance) }
    ] },
    { title: 'Context', fields: [
      { label: 'Summary', value: contact.context_summary, kind: 'long' },
      { label: 'Notes', value: contact.notes_summary, kind: 'long' },
      { label: 'Tags', value: contact.tags.length ? contact.tags.join(', ') : undefined }
    ] },
    { title: 'Follow-through', fields: [
      { label: 'Touch needed', value: contact.touch_needed ? 'Yes' : undefined },
      { label: 'Touch status', value: contact.touch_status && humanize(contact.touch_status) },
      { label: 'Last touch', value: contact.last_touch_date && friendlyWhen(contact.last_touch_date) },
      { label: 'Next follow-up', value: contact.next_follow_up_date && friendlyWhen(contact.next_follow_up_date) },
      { label: 'Follow-up status', value: contact.follow_up_status && humanize(contact.follow_up_status) }
    ] },
    { title: 'History', fields: [
      { label: 'Who introduced us', value: contact.who_introduced_us },
      { label: 'What we promised', value: contact.what_we_promised, kind: 'long' },
      { label: 'What they promised', value: contact.what_they_promised, kind: 'long' },
      { label: 'What they care about', value: contact.what_they_care_about, kind: 'long' },
      { label: 'We can help with', value: contact.we_can_help_them_with, kind: 'long' },
      { label: 'Helped us with', value: contact.helped_us_with, kind: 'long' },
      { label: 'Gratitude reason', value: contact.gratitude_reason, kind: 'long' },
      { label: 'Personal context', value: contact.personal_context, kind: 'long' },
      { label: 'Conversation energy', value: contact.conversation_energy && humanize(contact.conversation_energy) }
    ] },
    { title: 'Source', fields: [
      { label: 'Source type', value: contact.source_type && humanize(contact.source_type) },
      { label: 'Source event', value: contact.source_event },
      { label: 'Source detail', value: contact.source_detail, kind: 'long' }
    ] },
    { title: 'Record', fields: [
      { label: 'Added', value: contact.created_at ? `${friendlyWhen(contact.created_at, '')}${relativeWhen(contact.created_at) ? ` · ${relativeWhen(contact.created_at)}` : ''}` : undefined },
      { label: 'Updated', value: contact.updated_at ? `${friendlyWhen(contact.updated_at, '')}${relativeWhen(contact.updated_at) ? ` · ${relativeWhen(contact.updated_at)}` : ''}` : undefined },
      { label: 'Created by', value: contact.created_by },
      { label: 'Updated by', value: contact.updated_by },
      { label: 'Contact ID', value: contact.contact_id }
    ] }
  ];
  const groups = rawGroups.map((group) => ({ ...group, fields: group.fields.filter((field) => displayText(field.value).length > 0) })).filter((group) => group.fields.length > 0);

  return (
    <article className="network-detail-card" data-testid={`contact-detail-${contact.contact_id}`}>
      <header className="network-detail-head">
        <div>
          <div className="kicker">{humanize(contact.status)}{contact.person_type && contact.person_type !== 'unknown' ? ` • ${humanize(contact.person_type)}` : ''}</div>
          <h2>{clippedText(contact.full_name, 120, 'Unnamed contact')}</h2>
          <p className="muted">{contact.company || 'No company'}{contact.title ? ` • ${clippedText(contact.title, 80)}` : ''}</p>
        </div>
        <button type="button" className="btn small network-detail-close" onClick={onClose} aria-label="Close contact record"><X size={16} /></button>
      </header>
      <div className="network-detail-signals">
        <span className={`badge ${contact.priority === 'High' ? 'warn' : ''}`}>{contact.priority} priority</span>
        {contact.deal_flow_prospect === 'yes' && <span className="badge warn">Deal-flow prospect</span>}
        {contact.touch_needed && <span className="badge warn">Needs touch</span>}
      </div>
      {groups.map((group) => (
        <section className="network-detail-group" key={group.title}>
          <h4>{group.title}</h4>
          <dl>
            {group.fields.map((field) => (
              <div key={field.label} className={field.kind === 'long' ? 'long' : ''}>
                <dt>{field.label}</dt>
                <dd>{field.kind === 'link' ? <a href={String(field.value)} target="_blank" rel="noreferrer noopener">{clippedText(field.value, 80)} <ExternalLink size={13} aria-hidden="true" /></a> : clippedText(field.value, field.kind === 'long' ? 1200 : 240)}</dd>
              </div>
            ))}
          </dl>
        </section>
      ))}
      <footer className="action-footer">
        {contact.status === 'active'
          ? <button className="btn danger" disabled={busy} onClick={() => { if (window.confirm(`Archive ${contact.full_name}? The record will leave Active but remain restorable.`)) onStatus(contact.contact_id, 'archived'); }}>{busy ? 'Archiving…' : 'Archive contact'}</button>
          : <button className="btn primary" disabled={busy} onClick={() => onStatus(contact.contact_id, 'active')}>{busy ? 'Restoring…' : 'Restore contact'}</button>}
        <span className="muted">Archive and restore write to Google Sheets and refresh this list. Nothing is deleted.</span>
      </footer>
    </article>
  );
}
