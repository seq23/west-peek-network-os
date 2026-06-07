import { ArrowRight, BookOpen, Inbox, Plus, ShieldCheck } from 'lucide-react';
import type { ApprovalRecord, ContactRecord, IntakeRecord, NotificationRecord, RelationshipTouch } from '../domain/types';
import { Header } from './App';

type Page = 'dashboard' | 'instructions' | 'add' | 'intake' | 'contacts' | 'touches' | 'approvals' | 'notifications' | 'ai' | 'settings';

export function Dashboard({ data, go }: { data: { contacts: ContactRecord[]; intake: IntakeRecord[]; touches: RelationshipTouch[]; approvals: ApprovalRecord[]; notifications: NotificationRecord[] }; go: (page: Page) => void }) {
  return <>
    <div className="topbar">
      <div>
        <div className="eyebrow">West Peek internal</div>
        <h1>West Peek Network OS</h1>
        <h2 className="subtitle-heading">Relationship memory without CRM sludge.</h2>
        <p className="subtitle">Add people to the West Peek Network manually, from Gmail, or while emailing them in the moment. Intake comes first, AI prepares, humans approve.</p>
      </div>
      <div className="actions">
        <button className="btn primary" onClick={() => go('add')}><Plus size={17} /> Add to West Peek Network</button>
        <button className="btn" onClick={() => go('intake')}><Inbox size={17} /> Review Intake Queue</button>
        <button className="btn" onClick={() => go('instructions')}><BookOpen size={17} /> How to Add People</button>
      </div>
    </div>
    <div className="grid cols-3">
      <Metric label="People in Network" value={data.contacts.length} />
      <Metric label="Intake waiting" value={data.intake.filter((i) => !['converted', 'attached', 'dismissed'].includes(i.review_status)).length} />
      <Metric label="Approvals needed" value={data.approvals.filter((a) => a.status === 'pending').length} />
    </div>
    <div className="grid cols-2" style={{ marginTop: 16 }}>
      <div className="card">
        <div className="kicker">Quick actions</div>
        <div className="list">
          <Action title="Add to West Peek Network" body="Manual quick add for a person you met or already know." onClick={() => go('add')} />
          <Action title="Review Intake Queue" body="Convert #wpnetwork captures into clean relationship records." onClick={() => go('intake')} />
          <Action title="Approvals Needed" body="Review relationship-sensitive actions before execution." onClick={() => go('approvals')} />
          <Action title="How to Add People" body="Copyable examples for Gmail, live-event capture, and manual add." onClick={() => go('instructions')} />
        </div>
      </div>
      <div className="card">
        <div className="kicker">Operating law</div>
        <h2>AI prepares. Human approves. System executes.</h2>
        <p className="muted">Network OS keeps the warmth in the relationship and the discipline in the follow-through.</p>
        <div className="notice"><ShieldCheck size={16} /> Gmail triggers create Intake Queue items. They do not automatically create final West Peek Network records.</div>
      </div>
    </div>
    <div className="grid cols-2" style={{ marginTop: 16 }}>
      <Panel title="AI Suggestions Ready for Review" rows={['Suggested touch drafts, duplicate candidates, and context summaries wait for human approval.']} />
      <Panel title="Gmail Sync Status" rows={['Provider-gated: connect Google OAuth + Gmail API before production sync.']} />
      <Panel title="Touches Due This Week" rows={data.touches.map((t) => `${t.owner}: ${t.reason} (${t.method})`)} />
      <Panel title="Notifications" rows={data.notifications.map((n) => `${n.priority}: ${n.subject}`)} />
    </div>
    <div className="footer-status">Baseline proof label: STRUCTURALLY CHECKED target. External providers require configured secrets.</div>
  </>;
}

function Metric({ label, value }: { label: string; value: number }) {
  return <div className="card"><div className="metric">{value}</div><div className="muted">{label}</div></div>;
}
function Action({ title, body, onClick }: { title: string; body: string; onClick: () => void }) {
  return <button className="row" onClick={onClick}><span><strong>{title}</strong><br /><span className="muted">{body}</span></span><ArrowRight size={18} /></button>;
}
function Panel({ title, rows }: { title: string; rows: string[] }) {
  return <div className="card"><h3>{title}</h3><div className="list">{rows.map((row) => <div className="row" key={row}>{row}</div>)}</div></div>;
}
