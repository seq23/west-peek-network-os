import { useMemo, useState } from 'react';
import { Bell, BookOpen, CheckCircle2, ContactRound, Home, Inbox, LockKeyhole, Plus, Settings, Sparkles, Users } from 'lucide-react';
import { Dashboard } from './Dashboard';
import { Instructions } from './Instructions';
import { AddPerson } from './AddPerson';
import { store } from '../data/store';
import type { ApprovalRecord, ContactRecord, IntakeRecord, NotificationRecord, RelationshipTouch, TouchMethod } from '../domain/types';

type Page = 'dashboard' | 'instructions' | 'add' | 'intake' | 'contacts' | 'touches' | 'approvals' | 'notifications' | 'ai' | 'settings';

const navItems: Array<{ page: Page; label: string; icon: React.ReactNode }> = [
  { page: 'dashboard', label: 'Dashboard', icon: <Home size={17} /> },
  { page: 'add', label: 'Add to West Peek Network', icon: <Plus size={17} /> },
  { page: 'intake', label: 'Review Intake Queue', icon: <Inbox size={17} /> },
  { page: 'contacts', label: 'West Peek Network', icon: <Users size={17} /> },
  { page: 'touches', label: 'Relationship Touches', icon: <ContactRound size={17} /> },
  { page: 'approvals', label: 'Approvals', icon: <CheckCircle2 size={17} /> },
  { page: 'notifications', label: 'Notifications', icon: <Bell size={17} /> },
  { page: 'ai', label: 'AI Review', icon: <Sparkles size={17} /> },
  { page: 'instructions', label: 'How to Add People', icon: <BookOpen size={17} /> },
  { page: 'settings', label: 'Settings', icon: <Settings size={17} /> }
];

export function App() {
  const [page, setPage] = useState<Page>('dashboard');
  const [message, setMessage] = useState<string | null>(null);
  const [refreshToken, setRefreshToken] = useState(0);
  const data = useMemo(() => ({
    contacts: store.contacts(),
    intake: store.intake(),
    touches: store.touches(),
    approvals: store.approvals(),
    notifications: store.notifications()
  }), [refreshToken]);

  function refresh(nextMessage?: string) {
    setRefreshToken((value) => value + 1);
    if (nextMessage) setMessage(nextMessage);
  }

  function handleAdded(contact: ContactRecord, touchMethod: TouchMethod) {
    try {
      store.addContact(contact, touchMethod);
      refresh('Added to West Peek Network.');
      setPage('contacts');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Could not add person.');
    }
  }

  return (
    <div className="shell">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-mark">WP</div>
          <div>
            <div className="brand-title">Network OS</div>
            <div className="brand-sub">West Peek internal</div>
          </div>
        </div>
        <nav className="nav" aria-label="Primary">
          {navItems.map((item) => (
            <button key={item.page} className={page === item.page ? 'active' : ''} onClick={() => setPage(item.page)}>
              {item.icon} {item.label}
            </button>
          ))}
        </nav>
        <div className="sidebar-note">
          <LockKeyhole size={16} />
          <p><strong>Baseline note:</strong> this artifact includes working local operator flows, schemas, scripts, provider contracts, and Cloudflare API surfaces. External provider execution requires configured secrets.</p>
        </div>
      </aside>
      <main className="main">
        {message && <div className="notice" style={{ marginBottom: 16 }}>{message}</div>}
        {page === 'dashboard' && <Dashboard data={data} go={setPage} />}
        {page === 'instructions' && <Instructions />}
        {page === 'add' && <AddPerson onAdded={handleAdded} />}
        {page === 'intake' && <IntakePage rows={data.intake} onCapture={(raw) => { try { const item = store.addIntakeFromRaw(raw); refresh(`Captured intake item for ${item.parsed_name || 'review'}.`); } catch (error) { setMessage(error instanceof Error ? error.message : 'Could not capture intake.'); } }} onConvert={(id) => { try { const contact = store.convertIntake(id); refresh(`Added ${contact.full_name} to West Peek Network.`); } catch (error) { setMessage(error instanceof Error ? error.message : 'Could not convert intake.'); } }} onAttach={(id) => { try { const contact = store.attachIntakeToExisting(id); refresh(`Attached intake to ${contact.full_name}.`); } catch (error) { setMessage(error instanceof Error ? error.message : 'Could not attach intake.'); } }} onDismiss={(id) => { store.dismissIntake(id); refresh('Dismissed intake item.'); }} />}
        {page === 'contacts' && <ContactsPage rows={data.contacts} />}
        {page === 'touches' && <TouchesPage rows={data.touches} contacts={data.contacts} />}
        {page === 'approvals' && <ApprovalsPage rows={data.approvals} onApprove={(id) => { store.approve(id); refresh('Approval marked approved. Related notifications resolved.'); }} onReject={(id) => { store.reject(id); refresh('Approval rejected.'); }} />}
        {page === 'notifications' && <NotificationsPage rows={data.notifications} onRead={(id) => { store.markNotificationRead(id); refresh('Notification marked read.'); }} />}
        {page === 'ai' && <AiReview />}
        {page === 'settings' && <SettingsPanel />}
      </main>
    </div>
  );
}

function ContactsPage({ rows }: { rows: ContactRecord[] }) {
  return <>
    <Header eyebrow="West Peek Network" title="People in the West Peek Network" subtitle="Relationship context, ownership, and next-step memory." />
    <div className="grid cols-2">{rows.map((c) => <div className="card" key={c.contact_id}><h3>{c.full_name}</h3><p className="muted">{c.company || 'No company'} • Owner: {c.relationship_owner}</p><p>{c.context_summary}</p><p><span className="badge">{c.priority}</span>{c.touch_needed && <span className="badge warn" style={{ marginLeft: 8 }}>Needs touch</span>}</p></div>)}</div>
  </>;
}

function IntakePage({ rows, onCapture, onConvert, onAttach, onDismiss }: { rows: IntakeRecord[]; onCapture: (rawText: string) => void; onConvert: (id: string) => void; onAttach: (id: string) => void; onDismiss: (id: string) => void }) {
  function submitCapture(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    onCapture(String(form.get('raw_text') || ''));
    event.currentTarget.reset();
  }
  return <>
    <Header eyebrow="Intake Queue" title="Review captured relationship context" subtitle="Triggered Gmail, forwarded notes, and manual captures land here before being added to the West Peek Network." />
    <form className="card form" onSubmit={submitCapture}>
      <h2>Test / manual Gmail capture</h2>
      <p className="muted">Paste a #wpnetwork note here to create a real local Intake Queue item. Production Gmail sync writes through the same intake shape.</p>
      <textarea name="raw_text" aria-label="Gmail trigger text" required defaultValue={`#wpnetwork\nName: Jordan Miles\nCompany: Apex Family Office\nContext: Met at dinner. Wants to review late-stage venture deal flow.\nOwner: Sequoia\nNeeds Touch: Yes\nTouch: Email\nPriority: High\nDue: This week`} />
      <button className="btn primary" type="submit">Capture to Intake Queue</button>
    </form>
    <div className="list" style={{ marginTop: 16 }}>{rows.map((i) => <div className="card" key={i.intake_id} data-testid={`intake-${i.intake_id}`}><div className="kicker">{i.source} • {i.review_status}</div><h3>{i.parsed_name || 'Unparsed person'}</h3><p className="muted">{i.parsed_company || 'Company not parsed'}</p><p>{i.ai_summary || i.raw_text}</p><pre>{i.raw_text}</pre><div className="actions" style={{ marginTop: 12 }}><button className="btn primary" disabled={['converted', 'attached', 'dismissed'].includes(i.review_status)} onClick={() => onConvert(i.intake_id)}>Add to West Peek Network</button><button className="btn" disabled={['converted', 'attached', 'dismissed'].includes(i.review_status)} onClick={() => onAttach(i.intake_id)}>Attach to Existing Person</button><button className="btn" disabled={i.review_status === 'dismissed'} onClick={() => onDismiss(i.intake_id)}>Dismiss</button></div></div>)}</div>
  </>;
}

function TouchesPage({ rows, contacts }: { rows: RelationshipTouch[]; contacts: ContactRecord[] }) {
  return <>
    <Header eyebrow="Relationship Touches" title="Intentional follow-through" subtitle="Actions that say: I remembered, I appreciated it, I followed through." />
    <div className="grid cols-2">{rows.map((t) => {
      const contact = contacts.find((c) => c.contact_id === t.contact_id);
      const methodLabel = t.method.replace('_', ' ').replace(/\b\w/g, (char) => char.toUpperCase());
      return <div className="card" key={t.touch_id}><h3>{contact?.full_name || t.reason}</h3><p>{t.reason}</p><p><strong>Method:</strong> {methodLabel}</p><p className="muted">Owner: {t.owner} • Due: {t.due_date}</p><span className="badge warn">{t.status}</span></div>;
    })}</div>
  </>;
}

function ApprovalsPage({ rows, onApprove, onReject }: { rows: ApprovalRecord[]; onApprove: (id: string) => void; onReject: (id: string) => void }) {
  return <>
    <Header eyebrow="Approvals" title="Approvals Needed" subtitle="Internal approval gates before sensitive actions are finalized or executed." />
    <div className="list">{rows.map((a) => <div className="card" key={a.approval_id}><div className="kicker">{a.approval_type} • {a.risk_level}</div><h3>{a.status === 'pending' ? 'Needs decision' : a.status}</h3><p>{a.suggested_payload}</p><p className="muted">Assigned to: {a.assigned_to}</p><div className="actions"><button className="btn primary" disabled={a.status !== 'pending'} onClick={() => onApprove(a.approval_id)}>Approve</button><button className="btn" disabled={a.status !== 'pending'} onClick={() => onReject(a.approval_id)}>Reject</button></div></div>)}</div>
  </>;
}

function NotificationsPage({ rows, onRead }: { rows: NotificationRecord[]; onRead: (id: string) => void }) {
  return <>
    <Header eyebrow="Notifications" title="Calm reminders, not approvals" subtitle="Notification links open authenticated approval pages. They do not approve actions directly." />
    <div className="list">{rows.map((n) => <div className="card" key={n.notification_id}><div className="kicker">{n.priority} • {n.status}</div><h3>{n.subject}</h3><p className="muted">{n.recipient_email}</p>{n.body_preview && <p>{n.body_preview}</p>}<button className="btn" disabled={n.status !== 'unread'} onClick={() => onRead(n.notification_id)}>Mark read</button></div>)}</div>
  </>;
}

function AiReview() {
  return <>
    <Header eyebrow="AI review" title="AI Suggestions Ready for Review" subtitle="AI prepares. Human approves. System executes. Audit log records." />
    <div className="grid cols-2">
      <div className="card"><h3>Suggested touch</h3><p>Draft a handwritten note for Mike MacCombie thanking him for the intro.</p><span className="badge warn">Pending human approval</span></div>
      <div className="card"><h3>Duplicate candidate</h3><p>Exact email matches should warn before a new person is added to the West Peek Network.</p><span className="badge">Review queue</span></div>
    </div>
  </>;
}

function SettingsPanel() {
  return <>
    <Header eyebrow="Settings" title="Provider & Trigger Settings" subtitle="Secret values are supplied through the locked encrypted bundle and Cloudflare secret store, not plaintext repo files." />
    <div className="grid cols-2">
      <div className="card"><h3>Canonical trigger</h3><p><strong>#wpnetwork</strong></p><p className="muted">Accepted aliases: #addtowestpeek, #westpeeknetwork</p></div>
      <div className="card"><h3>Initial users</h3><p>sequoia@westpeek.ventures<br />scooter@westpeek.ventures</p></div>
      <div className="card"><h3>Team launchpad</h3><p>joinwestpeek.com/team</p><p className="muted">Shared password gate: 3021WPeek</p></div>
      <div className="card"><h3>Google Sheets</h3><p>Google Sheets is the v1 persistence layer for contacts, intake, touches, approvals, notifications, settings, and audit log.</p></div><div className="card"><h3>Cloudflare secrets</h3><p>Use scripts/secrets/push-cloudflare-secrets.sh after decrypting .env.local.</p></div>
    </div>
  </>;
}

export function Header({ eyebrow, title, subtitle }: { eyebrow: string; title: string; subtitle: string }) {
  return <div className="topbar"><div><div className="eyebrow">{eyebrow}</div><h1>{title}</h1><p className="subtitle">{subtitle}</p></div></div>;
}
