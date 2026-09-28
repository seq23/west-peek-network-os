import { AlertCircle, ArrowRight, CalendarDays, CreditCard, Inbox, Mic, Plus, ShieldCheck, Users } from 'lucide-react';
import { useEffect, useState } from 'react';
import { clippedText, displayText } from './text';
import { sortContacts } from '../domain/contactList';
import { relativeWhen } from './format';
import type { ApprovalRecord, ContactRecord, EventAttendeeRecord, EventRecord, IntakeRecord, IntroductionRecord, NotificationRecord, RelationshipTouch } from '../domain/types';

type Page = 'dashboard' | 'instructions' | 'events' | 'add' | 'intake' | 'contacts' | 'introductions' | 'touches' | 'approvals' | 'notifications' | 'ai' | 'settings';

type DashboardData = {
  contacts: ContactRecord[];
  introductions?: IntroductionRecord[];
  intake: IntakeRecord[];
  touches: RelationshipTouch[];
  approvals: ApprovalRecord[];
  notifications: NotificationRecord[];
  events?: EventRecord[];
  eventAttendees?: EventAttendeeRecord[];
};

type RuntimeStatus = {
  sheetStatus: string;
  sessionAuthenticated: boolean;
  sessionEmail?: string;
  usingLiveSheets: boolean;
  gmailOauthConnected: boolean;
  gmailOauthEmail?: string;
  gmailOauthCapturedAt?: string;
};

const openStatus = new Set(['new', 'ai_reviewed', 'pending_human_review', 'needs_human_review', 'needs_more_info']);
const openTouchStatus = new Set(['pending_approval', 'approved_ready_to_send', 'opened_vendor', 'will_do_myself', 'needed', 'planned', 'drafted']);

export function Dashboard({ data, go, openCapture, openContact, runtime, gmailSyncControl }: { data: DashboardData; go: (page: Page) => void; openCapture: () => void; openContact: (id: string) => void; runtime: RuntimeStatus; gmailSyncControl: React.ReactNode }) {
  useEffect(() => { if (runtime.usingLiveSheets && data.introductions?.some((row) => row.status === 'suggested')) void fetch('/api/introductions/weekly', {method:'POST',credentials:'same-origin'}).catch(() => undefined); }, [runtime.usingLiveSheets, data.introductions]);
  const [captureOpen, setCaptureOpen] = useState(() => typeof window !== 'undefined' && window.innerWidth > 1100);
  const openIntake = data.intake.filter((item) => openStatus.has(item.review_status));
  const openTouches = data.touches.filter((item) => openTouchStatus.has(item.status));
  const pendingApprovals = data.approvals.filter((item) => item.status === 'pending');
  const activeEvents = (data.events || []).filter((event) => event.status === 'active' && !isProofRecord(event.event_name, event.event_id));
  const missingInfo = data.intake.filter((item) => (item.missing_fields || item.review_status === 'needs_more_info') && !isProofRecord(item.parsed_name, item.intake_id));
  const queueCandidates = [
    ...openIntake.map((item) => ({
      key: `intake:${item.intake_id}`,
      label: clippedText(item.parsed_name || item.parsed_email || item.event_name, 90, 'Unreviewed intake'),
      detail: [humanSource(item.source), item.parsed_company, relativeDate(item.created_at), humanizeStatus(item.review_status)].filter(Boolean).join(' • '),
      page: 'intake' as Page
    })),
    ...openTouches.map((item) => ({
      key: `touch:${item.touch_id}`,
      label: clippedText(item.recipient_name || item.contact_email || item.reason, 90, 'Relationship touch'),
      detail: [humanizeStatus(item.method), item.company, item.due_date ? `Due ${friendlyDate(item.due_date)}` : '', humanizeStatus(item.status)].filter(Boolean).join(' • '),
      page: 'touches' as Page
    })),
    ...pendingApprovals.map((item) => ({
      key: `approval:${item.approval_id}`,
      label: humanizeStatus(item.approval_type || 'Approval needed'),
      detail: [humanizeStatus(item.risk_level), item.assigned_to, relativeDate(item.created_at)].filter(Boolean).join(' • '),
      page: 'approvals' as Page
    }))
  ].filter((item) => !isProofRecord(item.label));
  const nextWork = [...new Map(queueCandidates.map((item) => [`${item.page}:${item.label}:${item.detail}`, item])).values()].slice(0, 6);
  const recentPeople = sortContacts(data.contacts.filter((person) => person.status === 'active' && !isProofRecord(person.full_name, person.email, person.contact_id)), 'newest').slice(0, 8);

  return <>
    <section className="hero-panel">
      <div className="hero-copy">
        <div className="eyebrow">West Peek internal</div>
        <h1>Network OS</h1>
        <p className="subtitle hero-subtitle">Capture people, review intake, and keep relationships moving.</p>
        <div className="actions">
          <button className="btn primary" onClick={() => go('add')}><Plus size={17} /> Add person</button>
          <button className="btn dark" onClick={() => go('contacts')}><Users size={17} /> Open the network</button>
          <button className="btn" onClick={openCapture}><CreditCard size={17} /> Capture card or voice</button>
          <button className="btn" onClick={() => go('events')}><CalendarDays size={17} /> Create event form</button>
        </div>
      </div>
      <div className="status-card compact-status">
        <div className="section-head"><div><div className="kicker">System health</div><h2>{runtime.gmailOauthConnected && runtime.sessionAuthenticated && runtime.usingLiveSheets ? 'Ready' : 'Needs attention'}</h2></div><button className="btn small" onClick={() => go('settings')}>Details</button></div>
        <div className="health-chips" aria-label="Connection status"><span>Gmail OAuth: {runtime.gmailOauthConnected ? 'Connected' : 'Needs attention'}</span><span>Browser session: {runtime.sessionAuthenticated ? 'Connected' : 'Needs attention'}</span><span>Google Sheets: {runtime.usingLiveSheets ? 'Connected' : 'Needs attention'}</span></div>
        <details className="health-details"><summary>Connection details</summary><StatusLine
          label="Gmail OAuth"
          value={runtime.gmailOauthConnected ? `Connected: ${runtime.gmailOauthEmail || runtime.sessionEmail || 'approved user'}` : 'Not connected / token not found'}
          good={runtime.gmailOauthConnected}
        />
        <StatusLine
          label="Browser session"
          value={runtime.sessionAuthenticated ? `Signed in: ${runtime.sessionEmail}` : 'Not signed in on this browser'}
          good={runtime.sessionAuthenticated}
        />
        <StatusLine label="Google Sheets" value={runtime.usingLiveSheets ? 'Live snapshot loaded' : runtime.sheetStatus} good={runtime.usingLiveSheets} /></details>
        {(!runtime.gmailOauthConnected || !runtime.sessionAuthenticated || !runtime.usingLiveSheets) && <p className="muted">Resolve degraded connections in Settings before relying on sync, OCR, or transcription.</p>}
        <div className="dashboard-gmail-sync"><p className="muted">Check all eligible connected West Peek Gmail mailboxes and refresh Intake Queue.</p>{gmailSyncControl}</div>
      </div>
    </section>

    <section className="grid cols-4 compact-metrics">
      <Metric label="People" value={data.contacts.length} helper="Open the network" onClick={() => go('contacts')} />
      <Metric label="Open intake" value={openIntake.length} helper="Needs review" onClick={() => go('intake')} />
      <Metric label="Touchpoints" value={openTouches.length} helper="Open follow-up" onClick={() => go('touches')} />
      <Metric label="Active events" value={activeEvents.length} helper="Form links live" onClick={() => go('events')} />
    </section>

    <section className="card" style={{ marginTop: 16 }}><div className="section-head"><div><div className="kicker">Network connections</div><h2>Suggested introductions</h2></div><button className="btn small" onClick={() => go('introductions')}>Review intros</button></div><p>{(data.introductions || []).filter((row) => row.status === 'suggested').length} suggestions ready for review. Nothing sends without owner approval and an explicit send.</p></section>

    <section className="grid cols-2" style={{ marginTop: 16 }}>
      <div className="card recent-people"><div className="section-head"><div><div className="kicker">Network activity</div><h2>Recently added people</h2></div><button className="btn small" onClick={() => go('contacts')}>See all</button></div>{recentPeople.length ? <div className="list">{recentPeople.map((person) => <button className="row clean-row" key={person.contact_id} type="button" onClick={() => openContact(person.contact_id)}><span><strong>{displayText(person.full_name, 'Unnamed contact')}</strong><br /><span className="muted">{[person.company, person.relationship_owner, relativeWhen(person.created_at)].filter(Boolean).join(' · ')}</span></span><ArrowRight size={18} /></button>)}</div> : <EmptyState title="No recently added people" />}</div>
      <div className="card work-card">
        <div className="section-head"><div><div className="kicker">Operator queue</div><h2>Next work</h2></div><button className="btn small" onClick={() => go('intake')}>Review all</button></div>
        {nextWork.length ? <div className="list">{nextWork.map((item, index) => <button className="row clean-row" key={item.key || `${item.label}-${index}`} onClick={() => go(item.page)}><span><strong>{item.label}</strong><br /><span className="muted">{item.detail}</span></span><ArrowRight size={18} /></button>)}</div> : <EmptyState title="Nothing waiting" body="No pending intake, touches, or approvals in the current snapshot." />}
      </div>

      <details className="card action-grid-card" open={captureOpen} onToggle={(event) => setCaptureOpen(event.currentTarget.open)}><summary>Capture routes</summary>
        <h2>Choose the fastest path</h2>
        <div className="action-grid">
          <Action icon={<CalendarDays size={18} />} title="Event link" body="Let people fill out their own details." onClick={() => go('events')} />
          <Action icon={<Inbox size={18} />} title="#wpnetwork" body="Capture relationship context." onClick={() => go('instructions')} />
          <Action icon={<Inbox size={18} />} title="#wpdealflow / #dealflow" body="Capture founder / prospective deal flow into human review." onClick={() => go('instructions')} />
          <Action icon={<Mic size={18} />} title="Voice note" body="Upload audio and turn it into intake." onClick={openCapture} />
        </div>
      </details>
    </section>

    <section className="grid cols-3 secondary-panels" style={{ marginTop: 16 }}>
      <Panel title="Active events" count={activeEvents.length} empty="No active events yet." rows={activeEvents.slice(0, 5).map((event) => ({ title: clippedText(event.event_name, 90, 'Unnamed event'), meta: [event.event_date ? friendlyDate(event.event_date) : '', event.location].filter(Boolean).join(' • ') || 'Public form active' }))} actionLabel="Manage events" onClick={() => go('events')} />
      <Panel title="Missing info" count={missingInfo.length} empty="No missing-field items in this snapshot." rows={missingInfo.slice(0, 5).map((item) => ({ title: clippedText(item.parsed_name || item.parsed_email, 90, 'Unidentified intake'), meta: `${humanSource(item.source)} • Missing ${humanMissing(item.missing_fields)}${item.created_at ? ` • ${relativeDate(item.created_at)}` : ''}` }))} actionLabel="Review intake" onClick={() => go('intake')} />
      <Panel title="Notifications" count={data.notifications.filter((n) => n.status === 'unread').length} empty="No unread notifications." rows={data.notifications.filter((n) => n.status === 'unread').slice(0, 5).map((n) => ({ title: clippedText(n.subject, 90, 'Notification'), meta: `${humanizeStatus(n.priority)} priority${n.created_at ? ` • ${relativeDate(n.created_at)}` : ''}` }))} actionLabel="Open notifications" onClick={() => go('notifications')} />
    </section>

    <div className="truth-strip"><ShieldCheck size={16} /><span className="truth-long">Intake first. Review before final contact. No automatic emails, cards, vendor orders, payments, or AI execution.</span><span className="truth-short">Human review required. Nothing sends or executes automatically.</span></div>
  </>;
}

function StatusLine({ label, value, good = false }: { label: string; value: string; good?: boolean }) {
  return <div className="status-line"><span>{label}</span><strong className={good ? 'good' : ''}>{value}</strong></div>;
}
function Metric({ label, value, helper, onClick }: { label: string; value: number; helper: string; onClick?: () => void }) {
  const body = <><div className="metric">{value}</div><div><strong>{label}</strong><p className="muted">{helper}</p></div></>;
  if (onClick) return <button type="button" className="card metric-card metric-link" onClick={onClick} aria-label={`${label}: ${value}. ${helper}`}>{body}<ArrowRight size={16} className="metric-arrow" aria-hidden="true" /></button>;
  return <div className="card metric-card">{body}</div>;
}
function Action({ icon, title, body, onClick }: { icon: React.ReactNode; title: string; body: string; onClick: () => void }) {
  return <button className="quick-action" onClick={onClick}><span className="quick-icon">{icon}</span><span><strong>{title}</strong><small>{body}</small></span></button>;
}
function Panel({ title, count, rows, empty, actionLabel, onClick }: { title: string; count: number; rows: Array<{ title: string; meta?: string }>; empty: string; actionLabel: string; onClick: () => void }) {
  const [open, setOpen] = useState(() => typeof window !== 'undefined' && window.innerWidth >= 1280);
  return <details className="card panel-button" open={open} onToggle={(event) => setOpen(event.currentTarget.open)}>
    <summary><span><span className="panel-count">{count}</span><strong>{title}</strong></span><ArrowRight size={17} /></summary>
    <div className="panel-content">{rows.length ? <div className="list compact-list">{rows.map((row, index) => <div className="mini-card" key={`${row.title}-${index}`}><strong>{displayText(row.title, 'Untitled')}</strong>{row.meta && <small>{displayText(row.meta)}</small>}</div>)}</div> : <EmptyState title={empty} />}
    <button className="panel-action" type="button" onClick={onClick}>{actionLabel}<ArrowRight size={15} /></button></div>
  </details>;
}
function EmptyState({ title, body }: { title: string; body?: string }) {
  return <div className="empty-state"><AlertCircle size={18} /><strong>{title}</strong>{body && <p>{body}</p>}</div>;
}

function humanizeStatus(value: unknown) { return String(value || '').replaceAll('_', ' ').replace(/\b\w/g, (c) => c.toUpperCase()); }
function friendlyDate(value: unknown) { const date = new Date(String(value || '')); return Number.isNaN(date.getTime()) ? String(value || '') : date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: date.getFullYear() !== new Date().getFullYear() ? 'numeric' : undefined }); }
function relativeDate(value: unknown) { const date = new Date(String(value || '')); if (Number.isNaN(date.getTime())) return ''; const days = Math.floor((Date.now() - date.getTime()) / 86400000); if (days <= 0) return 'Today'; if (days === 1) return 'Yesterday'; if (days < 7) return `${days} days ago`; return friendlyDate(value); }
function isProofRecord(...values: unknown[]) {
  return values.some((value) => /tier[ _-]?4|proof|fixture|e2e|smoke[_ -]?test|wpno-tier4/i.test(String(value || '')));
}
function humanSource(value: unknown) { return String(value || 'capture').replaceAll('_', ' ').replace(/\b\w/g, (c) => c.toUpperCase()); }
function humanMissing(value: unknown) {
  const fields=String(value || 'more information').split(',').map((item)=>item.trim().replaceAll('_',' ')).filter(Boolean);
  return fields.length ? fields.join(', ') : 'more information';
}
