import { AlertCircle, ArrowRight, BookOpen, CalendarDays, CheckCircle2, CreditCard, Inbox, MailCheck, Mic, Plus, RefreshCw, ShieldCheck, Users } from 'lucide-react';
import type { ApprovalRecord, ContactRecord, EventAttendeeRecord, EventRecord, IntakeRecord, NotificationRecord, RelationshipTouch } from '../domain/types';

type Page = 'dashboard' | 'instructions' | 'events' | 'add' | 'capture' | 'thankyou' | 'intake' | 'contacts' | 'touches' | 'approvals' | 'notifications' | 'ai' | 'settings';

type DashboardData = {
  contacts: ContactRecord[];
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

export function Dashboard({ data, go, runtime }: { data: DashboardData; go: (page: Page) => void; runtime: RuntimeStatus }) {
  const openIntake = data.intake.filter((item) => openStatus.has(item.review_status));
  const openTouches = data.touches.filter((item) => openTouchStatus.has(item.status));
  const pendingApprovals = data.approvals.filter((item) => item.status === 'pending');
  const activeEvents = (data.events || []).filter((event) => event.status === 'active');
  const missingInfo = data.intake.filter((item) => item.missing_fields || item.review_status === 'needs_more_info');
  const nextWork = [
    ...openIntake.slice(0, 3).map((item) => ({ label: item.parsed_name || item.parsed_email || item.event_name || 'Unreviewed intake', detail: item.parsed_company || item.source || 'Pending human review', page: 'intake' as Page })),
    ...openTouches.slice(0, 2).map((item) => ({ label: item.recipient_name || item.contact_email || item.reason, detail: `${item.method} • ${item.status}`, page: 'touches' as Page })),
    ...pendingApprovals.slice(0, 2).map((item) => ({ label: item.approval_type || 'Approval needed', detail: item.risk_level, page: 'approvals' as Page }))
  ].slice(0, 6);

  return <>
    <section className="hero-panel">
      <div className="hero-copy">
        <div className="eyebrow">West Peek internal</div>
        <h1>Network OS</h1>
        <p className="subtitle hero-subtitle">Capture the person now. Add context later. Nothing becomes final until a human reviews it.</p>
        <div className="actions">
          <button className="btn primary" onClick={() => go('events')}><CalendarDays size={17} /> Create event form</button>
          <button className="btn dark" onClick={() => go('add')}><Plus size={17} /> Add person</button>
          <button className="btn" onClick={() => go('capture')}><CreditCard size={17} /> Card / voice capture</button>
        </div>
      </div>
      <div className="status-card">
        <div className="kicker">Live system status</div>
        <StatusLine
          label="Gmail OAuth"
          value={runtime.gmailOauthConnected ? `Connected: ${runtime.gmailOauthEmail || runtime.sessionEmail || 'approved user'}` : 'Not connected / token not found'}
          good={runtime.gmailOauthConnected}
        />
        <StatusLine
          label="Browser session"
          value={runtime.sessionAuthenticated ? `Signed in: ${runtime.sessionEmail}` : 'Not signed in on this browser'}
          good={runtime.sessionAuthenticated}
        />
        <StatusLine label="Google Sheets" value={runtime.usingLiveSheets ? 'Live snapshot loaded' : runtime.sheetStatus} good={runtime.usingLiveSheets} />
        <StatusLine label="Claude / Vision" value="Configured route available; run provider smoke test before claiming live OCR." />
        <StatusLine label="Speech-to-Text" value="Configured route available; real audio test required." />
        <button className="btn small" onClick={() => go('settings')}><RefreshCw size={15} /> Open settings</button>
      </div>
    </section>

    <section className="grid cols-4 compact-metrics">
      <Metric label="People" value={data.contacts.length} helper="Final network records" />
      <Metric label="Open intake" value={openIntake.length} helper="Needs review" />
      <Metric label="Touchpoints" value={openTouches.length} helper="Open follow-up" />
      <Metric label="Active events" value={activeEvents.length} helper="Form links live" />
    </section>

    <section className="grid cols-2" style={{ marginTop: 16 }}>
      <div className="card work-card">
        <div className="section-head"><div><div className="kicker">Operator queue</div><h2>Next work</h2></div><button className="btn small" onClick={() => go('intake')}>Review all</button></div>
        {nextWork.length ? <div className="list">{nextWork.map((item, index) => <button className="row clean-row" key={`${item.label}-${index}`} onClick={() => go(item.page)}><span><strong>{item.label}</strong><br /><span className="muted">{item.detail}</span></span><ArrowRight size={18} /></button>)}</div> : <EmptyState title="Nothing waiting" body="No pending intake, touches, or approvals in the current snapshot." />}
      </div>

      <div className="card action-grid-card">
        <div className="kicker">Capture routes</div>
        <h2>Choose the fastest path</h2>
        <div className="action-grid">
          <Action icon={<CalendarDays size={18} />} title="Event link" body="Let people fill out their own details." onClick={() => go('events')} />
          <Action icon={<Inbox size={18} />} title="#wpnetwork" body="Capture relationship context." onClick={() => go('instructions')} />
          <Action icon={<Inbox size={18} />} title="#wpdealflow" body="Capture founder / prospective deal flow." onClick={() => go('instructions')} />
          <Action icon={<Mic size={18} />} title="Voice note" body="Upload audio and turn it into intake." onClick={() => go('capture')} />
          <Action icon={<MailCheck size={18} />} title="Thank-you" body="Draft a card or touchpoint." onClick={() => go('thankyou')} />
        </div>
      </div>
    </section>

    <section className="grid cols-3" style={{ marginTop: 16 }}>
      <Panel title="Active events" empty="No active events yet." rows={activeEvents.map((event) => `${event.event_name}${event.location ? ` • ${event.location}` : ''}`)} onClick={() => go('events')} />
      <Panel title="Missing info" empty="No missing-field items in this snapshot." rows={missingInfo.slice(0, 6).map((item) => `${item.parsed_name || item.parsed_email || item.source}: ${item.missing_fields || 'needs more info'}`)} onClick={() => go('intake')} />
      <Panel title="Notifications" empty="No unread notifications." rows={data.notifications.filter((n) => n.status === 'unread').slice(0, 6).map((n) => `${n.priority}: ${n.subject}`)} onClick={() => go('notifications')} />
    </section>

    <div className="truth-strip"><ShieldCheck size={16} /> Intake first. Review before final contact. No automatic emails, cards, vendor orders, payments, or AI execution.</div>
  </>;
}

function StatusLine({ label, value, good = false }: { label: string; value: string; good?: boolean }) {
  return <div className="status-line"><span>{label}</span><strong className={good ? 'good' : ''}>{value}</strong></div>;
}
function Metric({ label, value, helper }: { label: string; value: number; helper: string }) {
  return <div className="card metric-card"><div className="metric">{value}</div><div><strong>{label}</strong><p className="muted">{helper}</p></div></div>;
}
function Action({ icon, title, body, onClick }: { icon: React.ReactNode; title: string; body: string; onClick: () => void }) {
  return <button className="quick-action" onClick={onClick}><span className="quick-icon">{icon}</span><span><strong>{title}</strong><small>{body}</small></span></button>;
}
function Panel({ title, rows, empty, onClick }: { title: string; rows: string[]; empty: string; onClick: () => void }) {
  return <button className="card panel-button" onClick={onClick}><div className="section-head"><h3>{title}</h3><ArrowRight size={17} /></div>{rows.length ? <div className="list compact-list">{rows.map((row) => <div className="mini-card" key={row}>{row}</div>)}</div> : <EmptyState title={empty} />}</button>;
}
function EmptyState({ title, body }: { title: string; body?: string }) {
  return <div className="empty-state"><AlertCircle size={18} /><strong>{title}</strong>{body && <p>{body}</p>}</div>;
}
