import { useEffect, useMemo, useState } from 'react';
import { Bell, BookOpen, CalendarDays, CheckCircle2, ContactRound, CreditCard, Home, Inbox, MailCheck, Plus, Settings, Sparkles, Users } from 'lucide-react';
import { Dashboard } from './Dashboard';
import { Instructions } from './Instructions';
import { AddPerson } from './AddPerson';
import { CaptureStudio } from './CaptureStudio';
import { ThankYouStudio } from './ThankYouStudio';
import { EventsPage } from './Events';
import { store } from '../data/store';
import { createSheetContact, createSheetIntake, decideSheetApproval, fetchSheetSnapshot, markSheetNotificationRead, reviewSheetIntake, updateSheetTouchFulfillment, type SheetSnapshot } from '../services/sheetsClient';
import type { ApprovalRecord, ContactRecord, IntakeRecord, NotificationRecord, RelationshipTouch, TouchMethod } from '../domain/types';
import { HANDWRITTEN_VENDORS, type HandwrittenVendor } from '../domain/handwrittenVendors';

type Page = 'dashboard' | 'instructions' | 'events' | 'add' | 'capture' | 'thankyou' | 'intake' | 'contacts' | 'touches' | 'approvals' | 'notifications' | 'ai' | 'settings';

const navItems: Array<{ page: Page; label: string; icon: React.ReactNode }> = [
  { page: 'dashboard', label: 'Dashboard', icon: <Home size={17} /> },
  { page: 'events', label: 'Events', icon: <CalendarDays size={17} /> },
  { page: 'add', label: 'Add Person', icon: <Plus size={17} /> },
  { page: 'capture', label: 'Capture Studio', icon: <CreditCard size={17} /> },
  { page: 'thankyou', label: 'Thank-You', icon: <MailCheck size={17} /> },
  { page: 'intake', label: 'Intake Queue', icon: <Inbox size={17} /> },
  { page: 'contacts', label: 'West Peek Network', icon: <Users size={17} /> },
  { page: 'touches', label: 'Touchpoints', icon: <ContactRound size={17} /> },
  { page: 'approvals', label: 'Approvals', icon: <CheckCircle2 size={17} /> },
  { page: 'notifications', label: 'Notifications', icon: <Bell size={17} /> },
  { page: 'ai', label: 'AI Smoke Test', icon: <Sparkles size={17} /> },
  { page: 'instructions', label: 'How to Add People', icon: <BookOpen size={17} /> },
  { page: 'settings', label: 'Settings', icon: <Settings size={17} /> }
];

type SessionState = { authenticated: boolean; email?: string; message: string };
type OAuthStatus = {
  ok?: boolean;
  browser_session_connected?: boolean;
  browser_session_email?: string;
  gmail_oauth_connected?: boolean;
  connected_email?: string;
  provider?: string;
  status?: string;
  token_captured_at?: string;
  token_updated_at?: string;
  source?: string;
  cache_ttl_seconds?: number;
  warning?: string;
  error?: string;
};


export function App() {
  const [page, setPage] = useState<Page>('dashboard');
  const [message, setMessage] = useState<string | null>(null);
  const [refreshToken, setRefreshToken] = useState(0);
  const [sheetData, setSheetData] = useState<SheetSnapshot | null>(null);
  const [sheetStatus, setSheetStatus] = useState('Loading Google Sheets snapshot...');
  const [session, setSession] = useState<SessionState>({ authenticated: false, message: 'Checking Google OAuth session...' });
  const [oauthStatus, setOauthStatus] = useState<OAuthStatus>({ gmail_oauth_connected: false, status: 'unknown' });
  const [oauthMessage, setOauthMessage] = useState('Checking Gmail OAuth token status...');
  const localData = useMemo(() => ({
    contacts: store.contacts(),
    intake: store.intake(),
    touches: store.touches(),
    approvals: store.approvals(),
    notifications: store.notifications(),
    events: [],
    eventAttendees: []
  }), [refreshToken]);
  const data = sheetData || localData;

  async function reloadSheetsSnapshot(nextMessage?: string) {
    try {
      const snapshot = await fetchSheetSnapshot();
      setSheetData(snapshot);
      setSheetStatus('Live Google Sheets snapshot loaded.');
      if (nextMessage) setMessage(nextMessage);
      return snapshot;
    } catch (error) {
      setSheetStatus(error instanceof Error ? error.message : 'Google Sheets snapshot unavailable.');
      if (nextMessage) setMessage(nextMessage);
      return null;
    }
  }

  async function loadSession() {
    try {
      const response = await fetch('/api/session', { credentials: 'same-origin' });
      const payload = await response.json().catch(() => ({})) as { authenticated?: boolean; user?: { email?: string }; error?: string };
      setSession({ authenticated: Boolean(payload.authenticated), email: payload.user?.email, message: payload.authenticated ? `Signed in as ${payload.user?.email || 'approved user'}` : (payload.error || 'No signed browser session in this browser.') });
    } catch (error) {
      setSession({ authenticated: false, message: error instanceof Error ? error.message : 'Could not check browser session.' });
    }
  }

  async function loadOAuthStatus() {
    try {
      const response = await fetch('/api/oauth/status', { credentials: 'same-origin' });
      const payload = await response.json().catch(() => ({})) as OAuthStatus;
      setOauthStatus(payload);
      if (payload.gmail_oauth_connected) {
        const suffix = payload.warning ? ` ${payload.warning}` : '';
        setOauthMessage(`Gmail OAuth token captured for ${payload.connected_email || payload.browser_session_email || 'approved user'}${payload.token_captured_at ? ` at ${payload.token_captured_at}` : ''}.${suffix}`);
      } else if (payload.status === 'temporarily_rate_limited') {
        setOauthMessage(payload.error || 'Google Sheets quota cooldown. Wait 60 seconds before refreshing connection status again.');
      } else if (payload.error) {
        setOauthMessage(payload.error);
      } else {
        setOauthMessage('No active Gmail OAuth token found in oauth_tokens.');
      }
    } catch (error) {
      setOauthStatus({ gmail_oauth_connected: false, status: 'unknown' });
      setOauthMessage(error instanceof Error ? error.message : 'Could not check Gmail OAuth token status.');
    }
  }

  async function refreshConnectionStatus() {
    await Promise.all([loadSession(), loadOAuthStatus()]);
  }

  useEffect(() => { void reloadSheetsSnapshot(); void refreshConnectionStatus(); }, []);

  function refresh(nextMessage?: string) {
    setRefreshToken((value) => value + 1);
    if (nextMessage) setMessage(nextMessage);
  }

  async function handleAdded(contact: ContactRecord, touchMethod: TouchMethod) {
    try {
      await createSheetContact(contact, touchMethod);
      await reloadSheetsSnapshot('Added to Google Sheets and refreshed the West Peek Network.');
      setPage('contacts');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Could not add person to Google Sheets.');
    }
  }

  async function handleIntakeCapture(rawText: string) {
    try {
      await createSheetIntake(rawText);
      await reloadSheetsSnapshot('Captured intake item to Google Sheets.');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Could not capture intake to Google Sheets.');
    }
  }

  async function handleIntakeReview(id: string, action: 'convert' | 'attach' | 'dismiss') {
    try {
      await reviewSheetIntake(id, action, action === 'attach' ? { attached_contact_id: window.prompt('Existing contact_id to attach to:') || '' } : {});
      await reloadSheetsSnapshot(`Intake ${action} recorded in Google Sheets.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : `Could not ${action} intake in Google Sheets.`);
    }
  }

  async function handleApprovalDecision(id: string, decision: 'approve' | 'reject') {
    try {
      const approval = data.approvals.find((item) => item.approval_id === id);
      await decideSheetApproval(id, decision);
      if (decision === 'approve' && approval?.source_entity_type === 'relationship_touch' && approval.source_entity_id) {
        const touch = data.touches.find((item) => item.touch_id === approval.source_entity_id);
        if (touch) {
          await updateSheetTouchFulfillment(touch, {
            status: 'approved_ready_to_send',
            fulfillment_status: 'approved_ready_to_send',
            fulfillment_notes: 'Approval recorded. Operator must choose a vendor handoff or mark I will do it myself. Network OS has not sent or paid for anything.',
            execution_allowed: false
          });
        }
      }
      await reloadSheetsSnapshot(decision === 'approve' ? 'Approval recorded. Handwritten/vendor touches are now ready for manual fulfillment choice.' : `Approval ${decision} recorded in Google Sheets.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Could not record approval decision.');
    }
  }

  async function handleTouchFulfillment(touch: RelationshipTouch, update: Partial<RelationshipTouch>) {
    try {
      await updateSheetTouchFulfillment(touch, update);
      await reloadSheetsSnapshot('Relationship touch fulfillment status recorded in Google Sheets.');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Could not update relationship touch fulfillment.');
    }
  }

  async function handleNotificationRead(id: string, recipientEmail = '') {
    try {
      await markSheetNotificationRead(id, recipientEmail);
      await reloadSheetsSnapshot('Notification read status recorded in Google Sheets.');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Could not mark notification read.');
    }
  }

  return (
    <div className="shell">
      <aside className="sidebar">
        <div className="brand">
          <img className="brand-logo" src="/wp-logo.jpg" alt="West Peek logo" />
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
          <strong>Truth state</strong>
          <p>{session.authenticated ? `Google OAuth connected: ${session.email}` : 'Google OAuth not connected in this browser.'}</p>
          <p>{sheetData ? 'Live Sheets snapshot loaded.' : 'Using local fallback until Sheets loads.'}</p>
        </div>
      </aside>
      <main className="main">
        {message && <div className="notice" style={{ marginBottom: 16 }}>{message}</div>}
        {page === 'dashboard' && <Dashboard data={data} go={setPage} runtime={{
          sheetStatus,
          sessionAuthenticated: session.authenticated,
          sessionEmail: session.email,
          usingLiveSheets: Boolean(sheetData),
          gmailOauthConnected: Boolean(oauthStatus.gmail_oauth_connected),
          gmailOauthEmail: oauthStatus.connected_email,
          gmailOauthCapturedAt: oauthStatus.token_captured_at
        }} />}
        {page === 'instructions' && <Instructions />}
        {page === 'events' && <EventsPage events={data.events} attendees={data.eventAttendees} onSaved={(nextMessage) => void reloadSheetsSnapshot(nextMessage || 'Event data saved to Google Sheets.')} />}
        {page === 'add' && <AddPerson onAdded={handleAdded} />}
        {page === 'capture' && <CaptureStudio events={data.events} onSaved={() => void reloadSheetsSnapshot('Capture saved to Google Sheets.')} />}
        {page === 'thankyou' && <ThankYouStudio onSaved={() => void reloadSheetsSnapshot('Thank-you touch saved to Google Sheets.')} />}
        {page === 'intake' && <IntakePage rows={data.intake} onCapture={(raw) => { void handleIntakeCapture(raw); }} onConvert={(id) => { void handleIntakeReview(id, 'convert'); }} onAttach={(id) => { void handleIntakeReview(id, 'attach'); }} onDismiss={(id) => { void handleIntakeReview(id, 'dismiss'); }} />}
        {page === 'contacts' && <ContactsPage rows={data.contacts} />}
        {page === 'touches' && <TouchesPage rows={data.touches} contacts={data.contacts} onFulfillmentUpdate={(touch, update) => { void handleTouchFulfillment(touch, update); }} />}
        {page === 'approvals' && <ApprovalsPage rows={data.approvals} onApprove={(id) => { void handleApprovalDecision(id, 'approve'); }} onReject={(id) => { void handleApprovalDecision(id, 'reject'); }} />}
        {page === 'notifications' && <NotificationsPage rows={data.notifications} onRead={(id, recipientEmail) => { void handleNotificationRead(id, recipientEmail); }} />}
        {page === 'ai' && <AiReview />}
        {page === 'settings' && <SettingsPanel
          sheetStatus={sheetStatus}
          session={session}
          oauthStatus={oauthStatus}
          oauthMessage={oauthMessage}
          onRefresh={() => void reloadSheetsSnapshot('Refreshed from Google Sheets.')}
          onSessionRefresh={() => void refreshConnectionStatus()}
          onMaintenanceComplete={() => void reloadSheetsSnapshot('Sheet maintenance finished and snapshot refreshed.')}
        />}
      </main>
    </div>
  );
}

function ContactsPage({ rows }: { rows: ContactRecord[] }) {
  return <>
    <Header eyebrow="West Peek Network" title="People in the West Peek Network" subtitle="Relationship context, ownership, and next-step memory." />
    <div className="grid cols-2">{rows.map((c) => <div className="card" key={c.contact_id}><h3>{c.full_name}</h3><p className="muted">{c.company || 'No company'} • Owner: {c.relationship_owner}</p><p>{c.context_summary}</p><p><span className="badge">{c.priority}</span>{c.person_type && c.person_type !== 'unknown' && <span className="badge" style={{ marginLeft: 8 }}>{c.person_type}</span>}{c.deal_flow_prospect === 'yes' && <span className="badge warn" style={{ marginLeft: 8 }}>Deal-flow prospect</span>}{c.touch_needed && <span className="badge warn" style={{ marginLeft: 8 }}>Needs touch</span>}</p></div>)}</div>
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
    <Header eyebrow="Intake Queue" title="Review captured relationship context" subtitle="Triggered Gmail, forwarded notes, business cards, screenshots, voice notes, and partial captures land here before being added to the West Peek Network." />
    <form className="card form" onSubmit={submitCapture}>
      <h2>Test / manual Gmail capture</h2>
      <p className="muted">Paste a #wpnetwork relationship note, or a #wpdealflow / #dealflow founder-deal-flow note, to create a real local Intake Queue item. Minimal captures are allowed; name/email/company/context can be enriched later.</p>
      <textarea name="raw_text" aria-label="Gmail trigger text" required defaultValue={`#wpdealflow\nName: Jordan Miles\nCompany: Apex Family Office\nContext: Founder referred by Scooter. Prospective deal flow for review. Include company, raise, traction, deck, and ask when available.\nOwner: Scooter\nPriority: High\nDue: This week`} />
      <button className="btn primary" type="submit">Capture to Intake Queue</button>
    </form>
    <div className="list" style={{ marginTop: 16 }}>{rows.map((i) => <div className="card" key={i.intake_id} data-testid={`intake-${i.intake_id}`}><div className="kicker">{i.source} • {i.review_status}{i.source_trigger ? ` • ${i.source_trigger}` : ''}</div><h3>{i.parsed_name || 'Unparsed person'}</h3><p className="muted">{i.parsed_company || 'Company not parsed'}</p><p>{i.ai_summary || i.raw_text}</p><p>{i.person_type && i.person_type !== 'unknown' && <span className="badge">{i.person_type}</span>}{i.deal_flow_prospect === 'yes' && <span className="badge warn" style={{ marginLeft: 8 }}>Deal-flow prospect</span>}</p><pre>{i.raw_text}</pre><div className="actions" style={{ marginTop: 12 }}><button className="btn primary" disabled={['converted', 'attached', 'dismissed'].includes(i.review_status)} onClick={() => onConvert(i.intake_id)}>Add to West Peek Network</button><button className="btn" disabled={['converted', 'attached', 'dismissed'].includes(i.review_status)} onClick={() => onAttach(i.intake_id)}>Attach to Existing Person</button><button className="btn" disabled={i.review_status === 'dismissed'} onClick={() => onDismiss(i.intake_id)}>Dismiss</button></div></div>)}</div>
  </>;
}

function TouchesPage({ rows, contacts, onFulfillmentUpdate }: { rows: RelationshipTouch[]; contacts: ContactRecord[]; onFulfillmentUpdate: (touch: RelationshipTouch, update: Partial<RelationshipTouch>) => void }) {
  return <>
    <Header eyebrow="Relationship Touches" title="Intentional follow-through" subtitle="Actions that say: I remembered, I appreciated it, I followed through. Handwritten notes stay manual until a human chooses vendor or self-fulfillment." />
    <div className="grid cols-2">{rows.map((t) => {
      const contact = contacts.find((c) => c.contact_id === t.contact_id);
      const methodLabel = t.method.replaceAll('_', ' ').replace(/\b\w/g, (char) => char.toUpperCase());
      const selectedVendor = HANDWRITTEN_VENDORS.find((vendor) => vendor.name === t.vendor_name) || HANDWRITTEN_VENDORS[0];
      const isHandwritten = t.method === 'handwritten_note' || t.card_type?.includes('handwritten');
      return <div className="card" key={t.touch_id}>
        <div className="kicker">{t.method} • {t.status}</div>
        <h3>{contact?.full_name || t.recipient_name || t.reason}</h3>
        <p>{t.reason}</p>
        <p><strong>Method:</strong> {methodLabel}</p>
        {t.draft_message && <p><strong>Draft:</strong> {t.draft_message}</p>}
        <p className="muted">Owner: {t.owner} • Due: {t.due_date}</p>
        <span className="badge warn">{t.fulfillment_status || t.status}</span>
        {isHandwritten && <HandwrittenFulfillmentPanel touch={t} selectedVendor={selectedVendor} onFulfillmentUpdate={onFulfillmentUpdate} />}
      </div>;
    })}</div>
  </>;
}

function HandwrittenFulfillmentPanel({ touch, selectedVendor, onFulfillmentUpdate }: { touch: RelationshipTouch; selectedVendor: HandwrittenVendor; onFulfillmentUpdate: (touch: RelationshipTouch, update: Partial<RelationshipTouch>) => void }) {
  const [vendorId, setVendorId] = useState(selectedVendor.id);
  const vendor = HANDWRITTEN_VENDORS.find((item) => item.id === vendorId) || HANDWRITTEN_VENDORS[0];
  const copyBlock = [
    touch.recipient_name && `Recipient: ${touch.recipient_name}`,
    touch.recipient_email && `Email: ${touch.recipient_email}`,
    touch.company && `Company: ${touch.company}`,
    touch.draft_message && `Message: ${touch.draft_message}`,
    touch.reason && `Reason/context: ${touch.reason}`
  ].filter(Boolean).join('\n');

  function copyDetails() {
    void navigator.clipboard?.writeText(copyBlock || touch.reason || 'Handwritten note needed.');
  }

  function useVendor() {
    onFulfillmentUpdate(touch, {
      status: 'opened_vendor',
      fulfillment_mode: 'vendor',
      fulfillment_status: 'opened_vendor',
      vendor_name: vendor.name,
      vendor_url: vendor.url,
      vendor_fit: vendor.fit,
      vendor_note: vendor.note,
      fulfillment_notes: 'Operator chose vendor handoff. Order/payment/send remains outside Network OS.',
      execution_allowed: false
    });
    if (vendor.url) window.open(vendor.url, '_blank', 'noopener,noreferrer');
  }

  function doItMyself() {
    onFulfillmentUpdate(touch, {
      status: 'will_do_myself',
      fulfillment_mode: 'self',
      fulfillment_status: 'will_do_myself',
      vendor_name: "I'll do it myself",
      vendor_url: '',
      fulfillment_notes: 'Operator chose to write/send this without a third-party vendor.',
      execution_allowed: false
    });
  }

  function markSent() {
    onFulfillmentUpdate(touch, {
      status: 'sent_externally',
      fulfillment_status: 'sent_externally',
      sent_at: new Date().toISOString(),
      fulfillment_notes: 'Operator marked this handwritten note as sent outside Network OS.',
      execution_allowed: false
    });
  }

  return <div className="vendor-panel">
    <h4>Handwritten note fulfillment</h4>
    <p className="muted">Approval means “ready for human fulfillment.” Network OS does not place the order, pay a vendor, or mail the card.</p>
    <label>Vendor / fulfillment route</label>
    <select value={vendorId} onChange={(event) => setVendorId(event.target.value)}>
      {HANDWRITTEN_VENDORS.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
    </select>
    <p className="muted"><strong>{vendor.fit}</strong><br />{vendor.note}</p>
    <div className="actions">
      <button className="btn" type="button" onClick={copyDetails}>Copy note details</button>
      {vendor.id === 'self' ? <button className="btn primary" type="button" onClick={doItMyself}>I’ll do it myself</button> : <button className="btn primary" type="button" onClick={useVendor}>Open vendor handoff</button>}
      <button className="btn" type="button" onClick={markSent}>Mark sent externally</button>
    </div>
  </div>;
}

function ApprovalsPage({ rows, onApprove, onReject }: { rows: ApprovalRecord[]; onApprove: (id: string) => void; onReject: (id: string) => void }) {
  return <>
    <Header eyebrow="Approvals" title="Approvals Needed" subtitle="Internal approval gates before sensitive actions are finalized or executed." />
    <div className="list">{rows.map((a) => <div className="card" key={a.approval_id}><div className="kicker">{a.approval_type} • {a.risk_level}</div><h3>{a.status === 'pending' ? 'Needs decision' : a.status}</h3><p>{a.suggested_payload}</p><p className="muted">Assigned to: {a.assigned_to}</p><div className="actions"><button className="btn primary" disabled={a.status !== 'pending'} onClick={() => onApprove(a.approval_id)}>Approve</button><button className="btn" disabled={a.status !== 'pending'} onClick={() => onReject(a.approval_id)}>Reject</button></div></div>)}</div>
  </>;
}

function NotificationsPage({ rows, onRead }: { rows: NotificationRecord[]; onRead: (id: string, recipientEmail?: string) => void }) {
  return <>
    <Header eyebrow="Notifications" title="Calm reminders, not approvals" subtitle="Notification links open authenticated approval pages. They do not approve actions directly." />
    <div className="list">{rows.map((n) => <div className="card" key={n.notification_id}><div className="kicker">{n.priority} • {n.status}</div><h3>{n.subject}</h3><p className="muted">{n.recipient_email}</p>{n.body_preview && <p>{n.body_preview}</p>}<button className="btn" disabled={n.status !== 'unread'} onClick={() => onRead(n.notification_id, n.recipient_email)}>Mark read</button></div>)}</div>
  </>;
}

function AiReview() {
  const [result, setResult] = useState<string>('No live Claude smoke test has run in this browser session. Sign in with Google first, then run this once when you want to spend a tiny live API call.');
  const [busy, setBusy] = useState(false);

  async function runSmokeTest() {
    setBusy(true);
    setResult('Calling /api/ai/suggestions/create...');
    try {
      const response = await fetch('/api/ai/suggestions/create', {
        credentials: 'same-origin',
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          raw_text: '#wpnetwork\nName: Jordan Miles\nCompany: Apex Family Office\nContext: Met at dinner. Wants to review late-stage venture deal flow. Needs a thoughtful email follow-up this week.\nOwner: Sequoia\nNeeds Touch: Yes\nTouch: Email\nPriority: High',
          source_entity_type: 'intake_queue',
          source_entity_id: 'browser_smoke_test',
          requested_by: 'sequoia@westpeek.ventures',
          suggestion_type: 'follow_up_recommendation'
        })
      });
      const payload = await response.json();
      setResult(JSON.stringify(payload, null, 2));
    } catch (error) {
      setResult(error instanceof Error ? error.message : 'AI smoke test failed.');
    } finally {
      setBusy(false);
    }
  }

  return <>
    <Header eyebrow="AI review" title="AI Suggestions Ready for Review" subtitle="AI prepares. Human approves. System never executes AI output without approval." />
    <div className="grid cols-2">
      <div className="card"><h3>Live Claude suggestion route</h3><p>Runs one authenticated smoke test against the deployed Cloudflare Function and writes a pending_human_review ai_suggestions row to Google Sheets.</p><p className="muted">Requires Google session. Uses a real Anthropic API call, so it may consume a small amount of Claude API credit.</p><button className="btn primary" disabled={busy} onClick={runSmokeTest}>{busy ? 'Testing Claude...' : 'Run Claude smoke test'}</button><pre>{result}</pre></div>
      <div className="card"><h3>Human-review guardrail</h3><p>The AI route returns <strong>human_review_required: true</strong> and <strong>execution_allowed: false</strong>. It does not send email, order gifts, merge contacts, delete records, or approve actions.</p><span className="badge warn">Pending human approval only</span></div>
    </div>
  </>;
}

function SettingsPanel({
  sheetStatus,
  session,
  oauthStatus,
  oauthMessage,
  onRefresh,
  onSessionRefresh,
  onMaintenanceComplete
}: {
  sheetStatus: string;
  session: SessionState;
  oauthStatus: OAuthStatus;
  oauthMessage: string;
  onRefresh: () => void;
  onSessionRefresh: () => void;
  onMaintenanceComplete: () => void;
}) {
  const [maintenanceStatus, setMaintenanceStatus] = useState<string | null>(null);
  const [maintenanceBusy, setMaintenanceBusy] = useState(false);
  const [refreshBusy, setRefreshBusy] = useState(false);

  async function guardedSessionRefresh() {
    if (refreshBusy) return;
    setRefreshBusy(true);
    try {
      await onSessionRefresh();
    } finally {
      setTimeout(() => setRefreshBusy(false), 1500);
    }
  }

  async function guardedSheetRefresh() {
    if (refreshBusy) return;
    setRefreshBusy(true);
    try {
      await onRefresh();
    } finally {
      setTimeout(() => setRefreshBusy(false), 1500);
    }
  }

  async function runSheetMaintenance() {
    if (maintenanceBusy) return;
    if (!session.authenticated) {
      setMaintenanceStatus('Authentication required. Connect / reconnect Gmail on this same production domain, then retry.');
      return;
    }
    setMaintenanceBusy(true);
    setMaintenanceStatus('Running non-destructive Sheet maintenance...');
    try {
      const response = await fetch('/api/admin/sheets/maintain', { method: 'POST', credentials: 'same-origin' });
      const payload = await response.json() as { ok?: boolean; run_id?: string; report_rows_written?: number; error?: string };
      if (!response.ok || !payload.ok) throw new Error(payload.error || 'Sheet maintenance failed.');
      setMaintenanceStatus(`Maintenance complete. Run ${payload.run_id}; report rows written: ${payload.report_rows_written ?? 0}.`);
      onMaintenanceComplete();
    } catch (error) {
      setMaintenanceStatus(error instanceof Error ? error.message : 'Sheet maintenance failed.');
    } finally {
      setMaintenanceBusy(false);
    }
  }

  return <>
    <Header eyebrow="Settings" title="Connections and operator settings" subtitle="Check OAuth, open the live spreadsheet, refresh data, and manage external handoff links." />
    <div className="grid cols-2">
      <div className="card">
        <h3>Google Gmail OAuth</h3>
        <p><strong>{oauthStatus.gmail_oauth_connected ? 'Connected' : 'Not connected / unknown'}</strong></p>
        <p className="muted">{oauthMessage}</p>
        <p className="muted">Browser session: {session.authenticated ? `signed in as ${session.email}` : session.message}</p>
        <div className="actions"><a className="btn primary" href="/auth/google">Connect / reconnect Gmail</a><button className="btn" type="button" disabled={refreshBusy} onClick={guardedSessionRefresh}>{refreshBusy ? 'Refreshing...' : 'Refresh connection status'}</button></div>
      </div>
      <div className="card"><h3>Canonical triggers</h3><p><strong>#wpnetwork</strong> relationship capture<br /><strong>#wpdealflow</strong> founder / prospective deal flow<br /><strong>#dealflow</strong> short alias for founder deal-flow capture</p><p className="muted">Relationship aliases: #addtowestpeek, #westpeeknetwork. Deal-flow aliases: #wpdealflow, #dealflow.</p></div>
      <div className="card"><h3>Initial users</h3><p>sequoia@westpeek.ventures<br />scooter@westpeek.ventures</p></div>
      <div className="card"><h3>Spreadsheet sync</h3><p>{sheetStatus}</p><p className="muted">The app reads from Google Sheets on load and after write actions. If someone edits the spreadsheet directly, click refresh to pull the latest rows into the app.</p><div className="actions"><button className="btn" type="button" disabled={refreshBusy || !session.authenticated} onClick={guardedSheetRefresh}>{refreshBusy ? 'Refreshing...' : 'Refresh from Google Sheets'}</button><button className="btn primary" type="button" disabled={maintenanceBusy || !session.authenticated} onClick={runSheetMaintenance}>{maintenanceBusy ? 'Running...' : 'Run Sheet Maintenance'}</button></div>{maintenanceStatus && <p className="muted">{maintenanceStatus}</p>}</div>
      <div className="card"><h3>Operator Login launchpads</h3><p>joinwestpeek.com/operator<br />westpeek.ventures/operator</p><p className="muted">Shared password gate: 3021WPeek. Links open Network OS and Venture Deals Calculator.</p></div>
      <div className="card">
        <h3>Google Sheets</h3>
        <p>Google Sheets is the v1 persistence layer for contacts, intake, touches, approvals, notifications, AI suggestions, OAuth tokens, and provider-backed capture rows.</p>
        <p><a className="btn primary" href="https://docs.google.com/spreadsheets/d/1g2Tyeb8u1sYYQB5dhMEFgIMd5SlZR1h1FxHWUhbG1G8/edit?usp=sharing" target="_blank" rel="noopener noreferrer">Open live spreadsheet →</a></p>
      </div>
      <div className="card"><h3>Handwritten note vendors</h3><p className="muted">Preferred starting point: Handwrytten for API/logo automation later. Backup: Simply Noted for real-ink note service. Simple fallback: Postable. Always include “I’ll do it myself” when no third party should be used.</p><div className="actions"><a className="btn" href="https://www.handwrytten.com/" target="_blank" rel="noopener noreferrer">Handwrytten</a><a className="btn" href="https://simplynoted.com/" target="_blank" rel="noopener noreferrer">Simply Noted</a><a className="btn" href="https://www.postable.com/business" target="_blank" rel="noopener noreferrer">Postable</a></div></div><div className="card"><h3>Cloudflare secrets</h3><p>Use scripts/secrets/push-cloudflare-secrets.sh after decrypting .env.local.</p></div>
    </div>
  </>;
}

export function Header({ eyebrow, title, subtitle }: { eyebrow: string; title: string; subtitle: string }) {
  return <div className="topbar"><div><div className="eyebrow">{eyebrow}</div><h1>{title}</h1><p className="subtitle">{subtitle}</p></div></div>;
}
