import { useEffect, useMemo, useState } from 'react';
import { Bell, BookOpen, CalendarDays, CheckCircle2, ContactRound, CreditCard, Home, Inbox, MailCheck, Menu, Plus, Settings, Sparkles, Users, X } from 'lucide-react';
import { Dashboard } from './Dashboard';
import { GmailSyncControl } from './GmailSyncControl';
import { Instructions } from './Instructions';
import { AddPerson } from './AddPerson';
import { CaptureStudio } from './CaptureStudio';
import { ThankYouStudio } from './ThankYouStudio';
import { EventsPage } from './Events';
import { clippedText, displayText } from './text';
import { store } from '../data/store';
import { createSheetContact, createSheetIntake, decideSheetApproval, fetchSheetSnapshot, markSheetNotificationRead, reviewSheetIntake, updateSheetTouchFulfillment, updateSheetContactStatus, updateSheetRecordLifecycle, type SheetSnapshot } from '../services/sheetsClient';
import type { AiSuggestionRecord, ApprovalRecord, ContactRecord, DealFlowProspect, IntakeRecord, NotificationRecord, Owner, RelationshipTouch, TouchMethod } from '../domain/types';
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
  { page: 'ai', label: 'AI Helper', icon: <Sparkles size={17} /> },
  { page: 'instructions', label: 'App Instructions', icon: <BookOpen size={17} /> },
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
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [refreshToken, setRefreshToken] = useState(0);
  const [mutationKey, setMutationKey] = useState<string | null>(null);
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
    aiSuggestions: [],
    events: [],
    eventAttendees: []
  }), [refreshToken]);
  const data = sheetData || localData;

  async function reloadSheetsSnapshot(nextMessage?: string, fresh = true) {
    try {
      const snapshot = await fetchSheetSnapshot({ fresh });
      setSheetData(snapshot);
      const freshness = snapshot.source === 'google_sheets_batch_cache' ? `Cached snapshot (${Math.round((snapshot.cacheAgeMs || 0) / 1000)}s old).` : `Fresh Google Sheets snapshot${snapshot.refreshedAt ? ` at ${new Date(snapshot.refreshedAt).toLocaleTimeString()}` : ''}.`;
      setSheetStatus(freshness);
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

  useEffect(() => { void reloadSheetsSnapshot(undefined, false); void refreshConnectionStatus(); }, []);

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

  async function handleIntakeReview(id: string, action: 'convert' | 'attach' | 'dismiss', conversion: { deal_flow_prospect?: DealFlowProspect; relationship_owner?: Owner } = {}) {
    const key = `intake:${id}:${action}`;
    if (mutationKey) return;
    setMutationKey(key);
    try {
      await reviewSheetIntake(id, action, action === 'attach' ? { attached_contact_id: window.prompt('Existing contact_id to attach to:') || '' } : conversion);
      await reloadSheetsSnapshot(`Intake ${action} recorded in Google Sheets.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : `Could not ${action} intake in Google Sheets.`);
    } finally {
      setMutationKey(null);
    }
  }

  async function handleApprovalDecision(id: string, decision: 'approve' | 'reject') {
    const key = `approval:${id}:${decision}`;
    if (mutationKey) return;
    setMutationKey(key);
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
    } finally {
      setMutationKey(null);
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

  async function handleContactStatus(id: string, status: 'active' | 'archived') {
    const key = `contact:${id}:${status}`;
    if (mutationKey) return;
    setMutationKey(key);
    try {
      await updateSheetContactStatus(id, status, status === 'archived' ? 'Archived by operator from West Peek Network.' : 'Restored by operator from archive.');
      await reloadSheetsSnapshot(status === 'archived' ? 'Contact archived and removed from Active.' : 'Contact restored to Active.');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Could not update contact status.');
    } finally {
      setMutationKey(null);
    }
  }

  async function handleLifecycle(entity: 'intake' | 'touch' | 'approval' | 'notification' | 'ai_suggestion' | 'event_attendee', id: string, action: 'archive' | 'restore') {
    const key = `${entity}:${id}:${action}`;
    if (mutationKey) return;
    setMutationKey(key);
    try {
      await updateSheetRecordLifecycle(entity, id, action, action === 'archive' ? 'Archived by operator from authenticated UI.' : 'Restored by operator from authenticated UI.');
      await reloadSheetsSnapshot(action === 'archive' ? 'Record archived and removed from the active view.' : 'Record restored.');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : `Could not ${action} record.`);
    } finally {
      setMutationKey(null);
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
      <aside className={`sidebar ${mobileNavOpen ? 'mobile-open' : ''}`}>
        <button className="mobile-nav-toggle" type="button" aria-expanded={mobileNavOpen} aria-controls="primary-navigation" onClick={() => setMobileNavOpen((value) => !value)}>{mobileNavOpen ? <X size={18} /> : <Menu size={18} />}<span>{mobileNavOpen ? 'Close menu' : 'Menu'}</span></button>
        <div className="brand">
          <img className="brand-logo" src="/wp-logo.jpg" alt="West Peek logo" />
          <div>
            <div className="brand-title">Network OS</div>
            <div className="brand-sub">West Peek internal</div>
          </div>
        </div>
        <nav id="primary-navigation" className="nav" aria-label="Primary">
          {navItems.map((item) => (
            <button key={item.page} className={page === item.page ? 'active' : ''} onClick={() => { setPage(item.page); setMobileNavOpen(false); }}>
              {item.icon} {item.label}
            </button>
          ))}
        </nav>
        <div className="sidebar-health" aria-label="System health"><span className={`health-dot ${session.authenticated && sheetData ? 'good' : ''}`} /><span>{session.authenticated && sheetData ? 'Systems ready' : 'Setup needs attention'}</span></div>
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
        }} gmailSyncControl={<GmailSyncControl authenticated={session.authenticated} compact onRefresh={() => reloadSheetsSnapshot('Gmail sync complete. Intake Queue refreshed.', true)} />} />}
        {page === 'instructions' && <Instructions />}
        {page === 'events' && <EventsPage events={data.events} attendees={data.eventAttendees} onAttendeeLifecycle={(id, action) => { void handleLifecycle('event_attendee', id, action); }} onSaved={(nextMessage) => void reloadSheetsSnapshot(nextMessage || 'Event data saved to Google Sheets.')} />}
        {page === 'add' && <AddPerson onAdded={handleAdded} />}
        {page === 'capture' && <CaptureStudio events={data.events} onSaved={() => void reloadSheetsSnapshot('Capture saved to Google Sheets.')} />}
        {page === 'thankyou' && <ThankYouStudio onSaved={() => void reloadSheetsSnapshot('Thank-you touch saved to Google Sheets.')} />}
        {page === 'intake' && <IntakePage gmailSyncControl={<GmailSyncControl authenticated={session.authenticated} onRefresh={() => reloadSheetsSnapshot('Gmail sync complete. Intake Queue refreshed.', true)} />} rows={data.intake} mutationKey={mutationKey} onCapture={(raw) => { void handleIntakeCapture(raw); }} onConvert={(id, conversion) => { void handleIntakeReview(id, 'convert', conversion); }} onAttach={(id) => { void handleIntakeReview(id, 'attach'); }} onDismiss={(id) => { void handleIntakeReview(id, 'dismiss'); }} />}
        {page === 'contacts' && <ContactsPage rows={data.contacts} mutationKey={mutationKey} onStatus={(id, status) => { void handleContactStatus(id, status); }} />}
        {page === 'touches' && <TouchesPage rows={data.touches} contacts={data.contacts} mutationKey={mutationKey} onLifecycle={(id, action) => { void handleLifecycle('touch', id, action); }} onFulfillmentUpdate={(touch, update) => { void handleTouchFulfillment(touch, update); }} />}
        {page === 'approvals' && <ApprovalsPage rows={data.approvals} mutationKey={mutationKey} onLifecycle={(id, action) => { void handleLifecycle('approval', id, action); }} onApprove={(id) => { void handleApprovalDecision(id, 'approve'); }} onReject={(id) => { void handleApprovalDecision(id, 'reject'); }} />}
        {page === 'notifications' && <NotificationsPage rows={data.notifications} mutationKey={mutationKey} onLifecycle={(id, action) => { void handleLifecycle('notification', id, action); }} onRead={(id, recipientEmail) => { void handleNotificationRead(id, recipientEmail); }} />}
        {page === 'ai' && <AiReview rows={data.aiSuggestions} mutationKey={mutationKey} onLifecycle={(id, action) => { void handleLifecycle('ai_suggestion', id, action); }} onCreated={async () => { await reloadSheetsSnapshot('AI Helper created a pending approval and notification.', true); setPage('approvals'); }} />}
        {page === 'settings' && <SettingsPanel
          sheetStatus={sheetStatus}
          session={session}
          oauthStatus={oauthStatus}
          oauthMessage={oauthMessage}
          onRefresh={() => void reloadSheetsSnapshot('Refreshed from Google Sheets. Live Google Sheets snapshot loaded.', true)}
          onSessionRefresh={() => void refreshConnectionStatus()}
          onMaintenanceComplete={() => void reloadSheetsSnapshot('Sheet maintenance finished and a fresh snapshot was loaded.', true)}
          gmailSyncControl={<GmailSyncControl authenticated={session.authenticated} onRefresh={() => reloadSheetsSnapshot('Gmail sync complete. Intake Queue refreshed.', true)} />}
        />}
      </main>
    </div>
  );
}

function ContactsPage({ rows, mutationKey, onStatus }: { rows: ContactRecord[]; mutationKey: string | null; onStatus: (id: string, status: 'active' | 'archived') => void }) {
  const [view, setView] = useState<'active' | 'archived' | 'all'>('active');
  const [search, setSearch] = useState('');
  const visible = rows.filter((row) => view === 'all' || row.status === view).filter((row) => !search || [row.full_name, row.email, row.company, row.context_summary, row.tags.join(' ')].join(' ').toLowerCase().includes(search.toLowerCase()));
  return <>
    <Header eyebrow="West Peek Network" title="People in the West Peek Network" subtitle="Active relationships appear first. Archived contacts stay recoverable and out of normal work surfaces." />
    <RouteGuide purpose="Find and manage finalized relationship records." primaryAction="Search or review active contacts." secondary="Archive stale records without deleting history." caution="Intake belongs in the Intake Queue until reviewed." />
    <div className="filter-bar"><input aria-label="Search contacts" placeholder="Search name, email, company, context, or tags" value={search} onChange={(event) => setSearch(event.target.value)} /><div className="segmented"><button className={view === 'active' ? 'active' : ''} onClick={() => setView('active')}>Active</button><button className={view === 'archived' ? 'active' : ''} onClick={() => setView('archived')}>Archived</button><button className={view === 'all' ? 'active' : ''} onClick={() => setView('all')}>All</button></div><span className="result-count">{visible.length} records</span></div>
    <div className="grid cols-2">{visible.length === 0 ? <div className="empty-state"><h3>{rows.length ? 'No contacts match this view' : 'No contacts yet'}</h3></div> : visible.map((c) => { const busy = mutationKey?.startsWith(`contact:${c.contact_id}:`); return <article className="card record-card" key={c.contact_id}><div className="record-header"><div><h3>{clippedText(c.full_name, 100, 'Unnamed contact')}</h3><p className="muted">{c.company || 'No company'} • Owner: {c.relationship_owner}</p><p className="contact-email">{c.email || 'No email on file'}</p></div><span className="badge">{humanize(c.status)}</span></div><p>{clippedText(c.context_summary, 420, 'No context yet.')}</p><p><span className="badge">{c.priority}</span>{c.person_type && c.person_type !== 'unknown' && <span className="badge badge-gap">{humanize(c.person_type)}</span>}{c.deal_flow_prospect === 'yes' && <span className="badge warn badge-gap">Deal-flow prospect</span>}{c.touch_needed && <span className="badge warn badge-gap">Needs touch</span>}</p><footer className="action-footer">{c.status === 'active' ? <button className="btn danger" disabled={Boolean(busy)} onClick={() => { if (window.confirm(`Archive ${c.full_name}? The record will leave Active but remain restorable.`)) onStatus(c.contact_id, 'archived'); }}>{busy ? 'Archiving…' : 'Archive contact'}</button> : <button className="btn primary" disabled={Boolean(busy)} onClick={() => onStatus(c.contact_id, 'active')}>{busy ? 'Restoring…' : 'Restore contact'}</button>}</footer></article>})}</div>
  </>;
}

function IntakePage({ gmailSyncControl, rows, mutationKey, onCapture, onConvert, onAttach, onDismiss }: { gmailSyncControl: React.ReactNode; rows: IntakeRecord[]; mutationKey: string | null; onCapture: (rawText: string) => void; onConvert: (id: string, conversion: { deal_flow_prospect: DealFlowProspect; relationship_owner: Owner }) => void; onAttach: (id: string) => void; onDismiss: (id: string) => void }) {
  const [view, setView] = useState<'pending' | 'history' | 'all'>('pending');
  const [search, setSearch] = useState('');
  const pendingStatuses = new Set(['new', 'ai_reviewed', 'pending_human_review', 'needs_human_review', 'needs_more_info', 'pending_network_review', 'event_intake_received']);
  const visibleRows = rows.filter((row) => view === 'all' || (view === 'pending' ? pendingStatuses.has(row.review_status) : !pendingStatuses.has(row.review_status))).filter((row) => !search || [row.parsed_name, row.parsed_company, row.parsed_email, row.email_subject, row.ai_summary, row.raw_text].join(' ').toLowerCase().includes(search.toLowerCase()));
  function submitCapture(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    onCapture(String(form.get('raw_text') || ''));
    event.currentTarget.reset();
  }
  return <>
    <Header eyebrow="Intake Queue" title="Review captured relationship context" subtitle="Actionable captures appear first. Use #wpdealflow / #dealflow for founder or prospective deal flow. Every capture remains in human review until an operator decides." />
    <RouteGuide purpose="Turn raw captures into trusted relationship records." primaryAction="Resolve pending intake one item at a time." secondary="Capture a manual note when no source integration is available." caution="Nothing converts, attaches, or dismisses without operator action." />
    <div className="card settings-operations"><h3>Import new Gmail intake</h3><p className="muted">Checks all eligible connected West Peek mailboxes, imports new qualifying messages, and refreshes this queue.</p>{gmailSyncControl}</div>
    <div className="filter-bar"><input aria-label="Search intake" placeholder="Search person, company, email, subject, or summary" value={search} onChange={(event) => setSearch(event.target.value)} /><div className="segmented" role="group" aria-label="Intake view"><button className={view === 'pending' ? 'active' : ''} onClick={() => setView('pending')}>Pending</button><button className={view === 'history' ? 'active' : ''} onClick={() => setView('history')}>History</button><button className={view === 'all' ? 'active' : ''} onClick={() => setView('all')}>All</button></div><span className="result-count">{visibleRows.length} records</span></div>
    <details className="card" open><summary>Manual capture</summary><form className="form compact-form" onSubmit={submitCapture}><p className="muted">Paste a real relationship or deal-flow note. Production forms start empty.</p><textarea name="raw_text" aria-label="Gmail trigger text" required placeholder="#wpnetwork or #wpdealflow, then the relationship context" /><button className="btn primary" type="submit">Capture to Intake Queue</button></form></details>
    <div className="list">{visibleRows.length === 0 ? <div className="empty-state"><h3>{rows.length ? 'No records match this view' : 'No intake records yet'}</h3><p>{rows.length ? 'Change the search or view filters.' : 'New review items will appear here.'}</p></div> : visibleRows.map((i) => { const busy = mutationKey?.startsWith(`intake:${i.intake_id}:`); return <article className="card record-card" key={i.intake_id} data-testid={`intake-${i.intake_id}`}><header className="record-header"><div><div className="kicker">{humanize(i.source)} • {humanize(i.review_status)}{i.created_at ? ` • ${relativeWhen(i.created_at)}` : ''}</div><h3>{i.parsed_name || i.email_from || 'Unparsed person'}</h3><p className="muted">{i.parsed_company || i.email_subject || 'Company not parsed'}{i.source_mailbox ? ` • via ${i.source_mailbox}` : ''}</p><p className="contact-email">{i.parsed_email || 'Email not parsed'}</p></div><div className="badge-stack">{i.missing_fields && <span className="badge warn">Missing {humanizeList(i.missing_fields)}</span>}{i.deal_flow_prospect === 'yes' && <span className="badge warn">Deal flow</span>}</div></header><p className="record-summary">{bounded(i.ai_summary || i.parsed_notes || i.raw_text, 420)}</p><details><summary>View source details</summary><dl className="metadata"><dt>From</dt><dd>{i.email_from || '—'}</dd><dt>To</dt><dd>{i.email_to || '—'}</dd><dt>Message ID</dt><dd>{i.gmail_message_id || '—'}</dd></dl><pre className="raw-source">{bounded(i.raw_text, 4000)}</pre></details>{view === 'pending' && <IntakeDecisionFooter intake={i} busy={Boolean(busy)} mutationKey={mutationKey} onConvert={onConvert} onAttach={onAttach} onDismiss={onDismiss} />}</article>})}</div>
  </>;
}

function IntakeDecisionFooter({ intake, busy, mutationKey, onConvert, onAttach, onDismiss }: { intake: IntakeRecord; busy: boolean; mutationKey: string | null; onConvert: (id: string, conversion: { deal_flow_prospect: DealFlowProspect; relationship_owner: Owner }) => void; onAttach: (id: string) => void; onDismiss: (id: string) => void }) {
  const [dealFlowProspect, setDealFlowProspect] = useState<DealFlowProspect>(intake.deal_flow_prospect || (intake.person_type === 'founder' ? 'yes' : 'unknown'));
  const [owner, setOwner] = useState<Owner>(intake.parsed_owner || 'Unassigned');
  return <>
    <div className="intake-decision-block"><p className="intake-decision-note">New Network contact settings — used only when you choose Add to West Peek Network.</p><div className="intake-decision-grid" aria-label="New Network contact conversion settings">
      <label>Deal-flow prospect<select aria-label={`Deal-flow prospect for ${intake.parsed_name || intake.intake_id}`} value={dealFlowProspect} disabled={busy} onChange={(event) => setDealFlowProspect(event.target.value as DealFlowProspect)}><option value="yes">Yes</option><option value="no">No</option><option value="unknown">Unknown</option></select></label>
      <label>Assign to<select aria-label={`Relationship owner for ${intake.parsed_name || intake.intake_id}`} value={owner} disabled={busy} onChange={(event) => setOwner(event.target.value as Owner)}><option value="Unassigned">Unassigned</option><option value="Sequoia">Sequoia</option><option value="Scooter">Scooter</option></select></label>
    </div></div>
    <footer className="action-footer"><button className="btn primary" disabled={busy} onClick={() => onConvert(intake.intake_id, { deal_flow_prospect: dealFlowProspect, relationship_owner: owner })}>{mutationKey === `intake:${intake.intake_id}:convert` ? 'Adding…' : 'Add to West Peek Network'}</button><button className="btn" disabled={busy} onClick={() => onAttach(intake.intake_id)}>{mutationKey === `intake:${intake.intake_id}:attach` ? 'Attaching…' : 'Attach to Existing Person'}</button><button className="btn danger" disabled={busy} onClick={() => onDismiss(intake.intake_id)}>{mutationKey === `intake:${intake.intake_id}:dismiss` ? 'Dismissing…' : 'Dismiss'}</button></footer>
  </>;
}

function TouchesPage({ rows, contacts, mutationKey, onLifecycle, onFulfillmentUpdate }: { rows: RelationshipTouch[]; contacts: ContactRecord[]; mutationKey: string | null; onLifecycle: (id: string, action: 'archive' | 'restore') => void; onFulfillmentUpdate: (touch: RelationshipTouch, update: Partial<RelationshipTouch>) => void }) {
  const [view, setView] = useState<'active' | 'archived'>('active');
  const visibleRows = rows.filter((row) => view === 'archived' ? row.status === 'cancelled' : row.status !== 'cancelled');
  return <>
    <Header eyebrow="Relationship Touches" title="Intentional follow-through" subtitle="Actions that say: I remembered, I appreciated it, I followed through. Handwritten notes stay manual until a human chooses vendor or self-fulfillment." />
    <RouteGuide purpose="Review relationship follow-through without confusing drafts with completed outreach." primaryAction="Work the next due touch, then record the fulfillment state." secondary="Use the recipient, method, due date, and reason to distinguish similar records." caution="Network OS never sends, orders, pays, or mails on its own." />
    <div className="filter-bar"><div className="segmented"><button className={view === 'active' ? 'active' : ''} onClick={() => setView('active')}>Active</button><button className={view === 'archived' ? 'active' : ''} onClick={() => setView('archived')}>Archived</button></div><span className="result-count">{visibleRows.length} records</span></div><div className="grid cols-2">{visibleRows.length === 0 ? <div className="empty-state"><h3>No relationship touches yet</h3><p>Approved follow-up drafts and thank-you actions will appear here.</p></div> : visibleRows.map((t) => {
      const contact = contacts.find((c) => c.contact_id === t.contact_id);
      const methodLabel = t.method.replaceAll('_', ' ').replace(/\b\w/g, (char) => char.toUpperCase());
      const selectedVendor = HANDWRITTEN_VENDORS.find((vendor) => vendor.name === t.vendor_name) || HANDWRITTEN_VENDORS[0];
      const isHandwritten = t.method === 'handwritten_note' || t.card_type?.includes('handwritten');
      return <article className="card record-card" key={t.touch_id}>
        <div className="record-header"><div><div className="kicker">{humanize(t.method)} • {humanize(t.status)}{t.created_at ? ` • ${relativeWhen(t.created_at)}` : ''}</div><h3>{contact?.full_name || t.recipient_name || t.reason}</h3><p className="muted">{t.company || contact?.company || 'No company'} • Owner: {t.owner}</p></div><span className="badge warn">{humanize(t.fulfillment_status || t.status)}</span></div>
        <p className="record-summary">{clippedText(t.reason, 420)}</p>
        <dl className="metadata compact-metadata"><dt>Method</dt><dd>{methodLabel}</dd><dt>Due</dt><dd>{friendlyWhen(t.due_date)}</dd>{t.recipient_email && <><dt>Recipient</dt><dd>{t.recipient_email}</dd></>}</dl>
        {t.draft_message && <details><summary>Preview draft</summary><p className="record-summary">{clippedText(t.draft_message, 1200)}</p></details>}
        {isHandwritten && <HandwrittenFulfillmentPanel touch={t} selectedVendor={selectedVendor} onFulfillmentUpdate={onFulfillmentUpdate} />}<footer className="action-footer">{t.status === 'cancelled' ? <button className="btn" disabled={Boolean(mutationKey)} onClick={() => onLifecycle(t.touch_id, 'restore')}>Restore touchpoint</button> : <button className="btn danger" disabled={Boolean(mutationKey)} onClick={() => { if (window.confirm('Archive this touchpoint?')) onLifecycle(t.touch_id, 'archive'); }}>{mutationKey === `touch:${t.touch_id}:archive` ? 'Archiving…' : 'Archive touchpoint'}</button>}</footer>
      </article>;
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

function ApprovalsPage({ rows, mutationKey, onLifecycle, onApprove, onReject }: { rows: ApprovalRecord[]; mutationKey: string | null; onLifecycle: (id: string, action: 'archive' | 'restore') => void; onApprove: (id: string) => void; onReject: (id: string) => void }) {
  const [view, setView] = useState<'pending' | 'history' | 'archived'>('pending');
  const visible = rows.filter((row) => view === 'pending' ? row.status === 'pending' : view === 'archived' ? row.status === 'cancelled' : row.status !== 'pending' && row.status !== 'cancelled');
  return <>
    <Header eyebrow="Approvals" title="Approvals Needed" subtitle="Pending decisions appear first; completed decisions remain in History." />
    <RouteGuide purpose="Make explicit decisions on sensitive or external actions." primaryAction="Review the payload and approve or reject." secondary="Use History to audit completed decisions." caution="Approval never means automatic payment, sending, or vendor execution." />
    <div className="filter-bar"><div className="segmented"><button className={view === 'pending' ? 'active' : ''} onClick={() => setView('pending')}>Pending</button><button className={view === 'history' ? 'active' : ''} onClick={() => setView('history')}>History</button><button className={view === 'archived' ? 'active' : ''} onClick={() => setView('archived')}>Archived</button></div><span className="result-count">{visible.length} records</span></div>
    <div className="list">{visible.length === 0 ? <div className="empty-state"><h3>{view === 'pending' ? 'No approvals need a decision' : 'No decided approvals yet'}</h3></div> : visible.map((a) => { const busy = mutationKey?.startsWith(`approval:${a.approval_id}:`); return <article className="card record-card" key={a.approval_id}><div className="record-header"><div><div className="kicker">{humanize(a.approval_type)} • {humanize(a.risk_level)} risk{a.created_at ? ` • ${relativeWhen(a.created_at)}` : ''}</div><h3>{humanize(a.status)}</h3><p className="muted">Assigned to {a.assigned_to}{a.requested_by ? ` • Requested by ${a.requested_by}` : ''}</p></div><span className={`badge ${a.risk_level === 'high' ? 'warn' : ''}`}>{humanize(a.risk_level)} risk</span></div><p className="record-summary">{clippedText(parseSuggestedPayload(a.suggested_payload).summary || a.suggested_payload, 700)}</p><details><summary>View full recommendation</summary><p>{clippedText(parseSuggestedPayload(a.suggested_payload).followUp || a.suggested_payload, 1400)}</p></details>{view === 'pending' && <footer className="action-footer"><button className="btn primary" disabled={Boolean(busy)} onClick={() => onApprove(a.approval_id)}>{mutationKey === `approval:${a.approval_id}:approve` ? 'Approving…' : 'Approve'}</button><button className="btn danger" disabled={Boolean(busy)} onClick={() => onReject(a.approval_id)}>{mutationKey === `approval:${a.approval_id}:reject` ? 'Rejecting…' : 'Reject'}</button></footer>}{view === 'history' && a.status !== 'cancelled' && <footer className="action-footer"><button className="btn danger" disabled={Boolean(busy)} onClick={() => { if (window.confirm('Archive this approval record from active history?')) onLifecycle(a.approval_id, 'archive'); }}>Archive record</button></footer>}{view === 'archived' && <footer className="action-footer"><button className="btn" disabled={Boolean(busy)} onClick={() => onLifecycle(a.approval_id, 'restore')}>Restore record</button></footer>}</article>})}</div>
  </>;
}

function NotificationsPage({ rows, mutationKey, onLifecycle, onRead }: { rows: NotificationRecord[]; mutationKey: string | null; onLifecycle: (id: string, action: 'archive' | 'restore') => void; onRead: (id: string, recipientEmail?: string) => void }) {
  const [view, setView] = useState<'unread' | 'all' | 'dismissed'>('unread');
  const visible = rows.filter((row) => view === 'dismissed' ? row.status === 'dismissed' : view === 'all' ? row.status !== 'dismissed' : row.status === 'unread');
  return <>
    <Header eyebrow="Notifications" title="Calm reminders, not approvals" subtitle="Notification links open authenticated approval pages. They do not approve actions directly." />
    <RouteGuide purpose="See what needs attention without mixing reminders with decisions." primaryAction="Open the relevant workflow, then mark the reminder read." caution="Notifications cannot approve or execute actions." />
    <div className="filter-bar"><div className="segmented"><button className={view === 'unread' ? 'active' : ''} onClick={() => setView('unread')}>Unread</button><button className={view === 'all' ? 'active' : ''} onClick={() => setView('all')}>All</button><button className={view === 'dismissed' ? 'active' : ''} onClick={() => setView('dismissed')}>Dismissed</button></div><span className="result-count">{visible.length} records</span></div><div className="list">{visible.length === 0 ? <div className="empty-state"><h3>{rows.length ? 'No unread notifications' : 'No notifications need attention'}</h3><p>Operational reminders will appear here without becoming approvals.</p></div> : visible.map((n) => <article className="card record-card" key={n.notification_id}><div className="record-header"><div><div className="kicker">{humanize(n.priority)} priority • {humanize(n.status)}{n.created_at ? ` • ${relativeWhen(n.created_at)}` : ''}</div><h3>{clippedText(n.subject, 120, 'Notification')}</h3><p className="muted">Recipient: {n.recipient_email || 'Operator'}</p></div>{n.status === 'unread' && <span className="badge warn">Needs attention</span>}</div>{n.body_preview && <p className="record-summary">{clippedText(n.body_preview, 800)}</p>}<footer className="action-footer"><button className="btn" disabled={n.status !== 'unread'} onClick={() => onRead(n.notification_id, n.recipient_email)}>{n.status === 'unread' ? 'Mark read' : 'Read'}</button>{n.status !== 'dismissed' ? <button className="btn danger" disabled={Boolean(mutationKey)} onClick={() => onLifecycle(n.notification_id, 'archive')}>Dismiss</button> : <button className="btn" disabled={Boolean(mutationKey)} onClick={() => onLifecycle(n.notification_id, 'restore')}>Restore</button>}</footer></article>)}</div>
  </>;
}

function parseSuggestedPayload(value: unknown) {
  const normalized = displayText(value, '');
  try {
    const parsed = JSON.parse(String(value || '{}')) as Record<string, unknown>;
    return {
      summary: displayText(parsed.summary, ''),
      followUp: displayText(parsed.suggested_follow_up, ''),
      method: displayText(parsed.suggested_touch_method, ''),
      priority: displayText(parsed.suggested_priority, ''),
      tags: Array.isArray(parsed.suggested_tags) ? parsed.suggested_tags.map((item) => displayText(item)).filter(Boolean) : []
    };
  } catch {
    return { summary: normalized, followUp: '', method: '', priority: '', tags: [] as string[] };
  }
}

function AiReview({ rows, mutationKey, onLifecycle, onCreated }: { rows: AiSuggestionRecord[]; mutationKey: string | null; onLifecycle: (id: string, action: 'archive' | 'restore') => void; onCreated: () => Promise<void> }) {
  const [request, setRequest] = useState('Summarize this relationship context and recommend a thoughtful next step.');
  const [result, setResult] = useState('Ask Claude to summarize, classify, draft, or recommend a next step. Every response becomes a reviewable approval; nothing executes automatically.');
  const [busy, setBusy] = useState(false);

  async function runHelper() {
    const rawText = request.trim();
    if (!rawText) { setResult('Enter a request or relationship context first.'); return; }
    setBusy(true);
    setResult('Claude is preparing a reviewable suggestion...');
    try {
      const response = await fetch('/api/ai/suggestions/create', {
        credentials: 'same-origin', method: 'POST', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ raw_text: rawText, source_entity_type: 'adhoc', source_entity_id: `ai_helper_${Date.now()}`, suggestion_type: 'follow_up_recommendation' })
      });
      const payload = await response.json() as { ok?: boolean; error?: string; approval?: { approval_id?: string }; suggestion?: { reasoning_summary?: string } };
      if (!response.ok || !payload.ok) throw new Error(payload.error || `AI Helper failed with HTTP ${response.status}`);
      setResult(`Suggestion created and routed to Approvals${payload.approval?.approval_id ? ` (${payload.approval.approval_id})` : ''}. ${displayText(payload.suggestion?.reasoning_summary, '')}`);
      await onCreated();
    } catch (error) { setResult(error instanceof Error ? error.message : 'AI Helper request failed.'); }
    finally { setBusy(false); }
  }

  return <>
    <Header eyebrow="AI Helper" title="Ask Claude for a reviewable next step" subtitle="Claude prepares summaries, classifications, drafts, and recommendations. Every result routes to Approvals; nothing executes automatically." />
    <RouteGuide purpose="Turn relationship context into a structured suggestion." primaryAction="Describe what you want Claude to prepare." secondary="Review the linked approval and notification after creation." caution="AI cannot send, pay, delete, merge, or approve on your behalf." />
    <div className="grid cols-2 ai-helper-grid">
      <div className="card ai-helper-request"><h3>Request</h3><label htmlFor="ai-helper-request">What should Claude help with?</label><textarea id="ai-helper-request" value={request} onChange={(event) => setRequest(event.target.value)} rows={9} maxLength={6000} placeholder="Paste relationship context and ask for a summary, follow-up draft, classification, or next-step recommendation." /><div className="helper-row"><span className="muted">{request.length}/6000</span><button className="btn primary" disabled={busy} onClick={runHelper}>{busy ? 'Preparing…' : 'Ask AI Helper'}</button></div><div className="operation-result" role="status">{result}</div></div>
      <div className="card"><h3>What AI Helper can do</h3><ul className="clean-list"><li>Summarize long email or relationship context.</li><li>Recommend a follow-up and touch method.</li><li>Draft reviewable outreach language.</li><li>Suggest priority, tags, and classification.</li><li>Flag ambiguity for human review.</li></ul><h3>What it cannot do</h3><p>It cannot send email, order gifts, merge contacts, delete records, change ownership, or approve actions.</p><span className="badge warn">Human approval required</span></div>
    </div>
    <div className="list">{rows.filter((row) => row.status !== 'dismissed').map((row) => { const payload = parseSuggestedPayload(row.suggested_payload); return <article className="card record-card" key={row.suggestion_id}><div className="record-header"><div><div className="kicker">{humanize(row.suggestion_type)} • {humanize(row.status)}</div><h3>{clippedText(row.reasoning_summary, 160, 'AI suggestion')}</h3></div><span className="badge">{humanize(row.confidence)}</span></div><p className="record-summary">{clippedText(payload.summary || row.reasoning_summary, 560)}</p>{payload.followUp && <details><summary>View recommended follow-up</summary><p>{clippedText(payload.followUp, 1200)}</p><dl className="metadata"><dt>Method</dt><dd>{payload.method || '—'}</dd><dt>Priority</dt><dd>{payload.priority || '—'}</dd><dt>Tags</dt><dd>{payload.tags.join(', ') || '—'}</dd></dl></details>}<footer className="action-footer"><button className="btn danger" disabled={Boolean(mutationKey)} onClick={() => onLifecycle(row.suggestion_id, 'archive')}>Dismiss suggestion</button></footer></article>})}</div>
  </>;
}

function SettingsPanel({
  sheetStatus,
  session,
  oauthStatus,
  oauthMessage,
  onRefresh,
  onSessionRefresh,
  onMaintenanceComplete,
  gmailSyncControl
}: {
  sheetStatus: string;
  session: SessionState;
  oauthStatus: OAuthStatus;
  oauthMessage: string;
  onRefresh: () => void;
  onSessionRefresh: () => void;
  onMaintenanceComplete: () => void;
  gmailSyncControl: React.ReactNode;
}) {
  const [maintenanceStatus, setMaintenanceStatus] = useState<string | null>(null);
  const [maintenanceBusy, setMaintenanceBusy] = useState(false);
  const [refreshBusy, setRefreshBusy] = useState(false);
  const [cleanupRunId, setCleanupRunId] = useState('');
  const [cleanupBusy, setCleanupBusy] = useState(false);
  const [cleanupPreview, setCleanupPreview] = useState<Record<string, number> | null>(null);
  const [cleanupStatus, setCleanupStatus] = useState('');

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

  async function callCleanup(tab: string, dryRun: boolean, verifyOnly = false) {
    const response = await fetch('/api/proof-fixtures/cleanup', {
      method: 'POST',
      credentials: 'same-origin',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ run_id: cleanupRunId.trim(), confirm: 'CLEAN_TIER4_PROOF_FIXTURES', dry_run: dryRun, verify_only: verifyOnly, tab, limit: 15 })
    });
    const payload = await response.json() as { ok?: boolean; matched?: number; cleaned?: number; remaining?: number; error?: string };
    if (!response.ok || !payload.ok) throw new Error(payload.error || `Cleanup failed for ${tab}.`);
    return payload;
  }

  async function previewProofCleanup() {
    if (cleanupBusy) return;
    if (!session.authenticated) { setCleanupStatus('Authentication required.'); return; }
    if (!/^wpno-tier4-[A-Za-z0-9._:-]+$/.test(cleanupRunId.trim())) { setCleanupStatus('Enter the exact wpno-tier4 run ID.'); return; }
    setCleanupBusy(true);
    setCleanupStatus('Previewing exact-run production fixtures...');
    try {
      const tabs = ['contacts', 'intake_queue', 'relationship_touches', 'approvals', 'notifications', 'ai_suggestions', 'events', 'event_attendees', 'provider_replay_guard'];
      const counts: Record<string, number> = {};
      for (const tab of tabs) counts[tab] = Number((await callCleanup(tab, true)).matched || 0);
      setCleanupPreview(counts);
      const total = Object.values(counts).reduce((sum, value) => sum + value, 0);
      setCleanupStatus(`Preview complete: ${total} active proof fixtures matched this exact run.`);
    } catch (error) {
      setCleanupStatus(error instanceof Error ? error.message : 'Cleanup preview failed.');
    } finally { setCleanupBusy(false); }
  }

  async function executeProofCleanup() {
    if (cleanupBusy || !cleanupPreview) return;
    const total = Object.values(cleanupPreview).reduce((sum, value) => sum + value, 0);
    if (!window.confirm(`Clean ${total} Tier 4 proof fixtures for ${cleanupRunId.trim()}? Only this exact run ID will be affected.`)) return;
    setCleanupBusy(true);
    setCleanupStatus('Cleaning production proof fixtures in bounded batches...');
    try {
      const tabs = Object.keys(cleanupPreview);
      let cleanedTotal = 0;
      for (const tab of tabs) {
        let remaining = cleanupPreview[tab] || 0;
        while (remaining > 0) {
          const result = await callCleanup(tab, false);
          const cleaned = Number(result.cleaned || 0);
          const nextRemaining = Number(result.remaining || 0);
          if (nextRemaining > 0 && cleaned === 0) throw new Error(`Cleanup made no progress for ${tab}; stopping to avoid an infinite loop.`);
          cleanedTotal += cleaned;
          remaining = nextRemaining;
        }
      }
      const verification: Record<string, number> = {};
      for (const tab of tabs) verification[tab] = Number((await callCleanup(tab, false, true)).remaining || 0);
      const remainingTotal = Object.values(verification).reduce((sum, value) => sum + value, 0);
      if (remainingTotal !== 0) throw new Error(`Cleanup verification failed: ${remainingTotal} active fixtures remain.`);
      setCleanupPreview(null);
      setCleanupStatus(`Cleanup verified: ${cleanedTotal} fixture versions written; zero active fixtures remain for this run.`);
      await onRefresh();
    } catch (error) {
      setCleanupStatus(error instanceof Error ? error.message : 'Cleanup failed. Rerun preview; the operation is idempotent.');
    } finally { setCleanupBusy(false); }
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
      const payload = await response.json() as { ok?: boolean; run_id?: string; report_rows_written?: number; summary?: Record<string, number>; error?: string; error_code?: string; operator_action?: string; technical_detail?: string };
      if (!response.ok || !payload.ok) throw new Error([payload.error_code, payload.error, payload.operator_action].filter(Boolean).join(' — ') || 'Sheet maintenance failed.');
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
    <RouteGuide purpose="Maintain provider connections and operational health." primaryAction="Fix degraded connections before running sync or maintenance." secondary="Refresh data only when a current readback is needed." caution="Maintenance is non-destructive; shared inboxes require separate connection." />
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
      <div className="card settings-operations"><h3>Google Sheets data</h3><p><strong>{sheetStatus}</strong></p><p className="muted"><strong>Refresh app data from Google Sheets</strong> reloads records that already exist in the workbook. It does not check Gmail, import emails, or create intake records.</p><button className="btn" type="button" disabled={refreshBusy || !session.authenticated} onClick={guardedSheetRefresh}>{refreshBusy ? 'Refreshing from Sheets…' : 'Refresh from Google Sheets'}</button></div>
      <div className="card settings-operations"><h3>Gmail intake sync</h3><p className="muted"><strong>Import new intake emails from connected Gmail</strong> checks every eligible West Peek mailbox that is actually connected: <strong>info@westpeek.ventures</strong>, <strong>sequoia@westpeek.ventures</strong>, and <strong>scooter@westpeek.ventures</strong>.</p><p className="muted">Personal mailboxes import only canonical trigger messages: #wpnetwork, #addtowestpeek, #westpeeknetwork, #wpdealflow, or #dealflow. The separately connected info@westpeek.ventures shared inbox may classify eligible founder or deal-flow messages without a hashtag.</p><div className="notice subtle">Each mailbox must be connected separately. The result names exactly which connected mailboxes were checked. Every imported message still requires human review and duplicate protection.</div>{gmailSyncControl}</div>
      <div className="card settings-operations"><h3>Sheet maintenance</h3><p className="muted">Runs a non-destructive structural check. It creates missing tabs, restores required headers, normalizes supported status and boolean values, fills missing timestamps where safe, and reports possible duplicates. It does not delete or merge records.</p><button className="btn" type="button" disabled={maintenanceBusy || !session.authenticated} onClick={() => { if (window.confirm('Run non-destructive Sheet maintenance? This may create missing tabs, restore required headers, normalize supported values, fill safe missing timestamps, and write an audit report. It will not delete or merge records.')) void runSheetMaintenance(); }}>{maintenanceBusy ? 'Running maintenance…' : 'Run Sheet Maintenance'}</button>{maintenanceStatus && <p className="operation-result" role="status" aria-live="polite">{maintenanceStatus}</p>}</div>
      <div className="card settings-operations"><h3>Tier 4 test-data cleanup</h3><p className="muted">Removes only proof fixtures tied to one exact <code>wpno-tier4-*</code> run ID. Preview is required before cleanup. Records are archived or marked proof-cleaned in Google Sheets and disappear from active app views after verified readback.</p><label><span className="muted">Exact Tier 4 run ID</span><input value={cleanupRunId} onChange={(event) => { setCleanupRunId(event.target.value); setCleanupPreview(null); }} placeholder="wpno-tier4-YYYYMMDDTHHMMSSZ" autoComplete="off" /></label><div className="actions"><button className="btn" type="button" disabled={cleanupBusy || !session.authenticated} onClick={() => void previewProofCleanup()}>{cleanupBusy ? 'Working…' : 'Preview test data'}</button><button className="btn primary" type="button" disabled={cleanupBusy || !cleanupPreview || !session.authenticated} onClick={() => void executeProofCleanup()}>Clean previewed test data</button></div>{cleanupPreview && <p className="muted">Matched: {Object.values(cleanupPreview).reduce((sum, value) => sum + value, 0)} active fixtures.</p>}{cleanupStatus && <p className="operation-result" role="status" aria-live="polite">{cleanupStatus}</p>}</div>
      <div className="card"><h3>Operator Login launchpads</h3><p>joinwestpeek.com/operator<br />westpeek.ventures/operator</p><p className="muted">Team-area access is managed outside this repo. No shared password or passphrase is stored or displayed here.</p></div>
      <div className="card">
        <h3>Google Sheets</h3>
        <p>Google Sheets is the v1 persistence layer for contacts, intake, touches, approvals, notifications, AI suggestions, OAuth tokens, and provider-backed capture rows. The live spreadsheet link is intentionally kept in operator docs/password manager, not exposed in the browser UI.</p>
      </div>
      <div className="card"><h3>Handwritten note vendors</h3><p className="muted">Preferred starting point: Handwrytten for API/logo automation later. Backup: Simply Noted for real-ink note service. Simple fallback: Postable. Always include “I’ll do it myself” when no third party should be used.</p><div className="actions"><a className="btn" href="https://www.handwrytten.com/" target="_blank" rel="noopener noreferrer">Handwrytten</a><a className="btn" href="https://simplynoted.com/" target="_blank" rel="noopener noreferrer">Simply Noted</a><a className="btn" href="https://www.postable.com/business" target="_blank" rel="noopener noreferrer">Postable</a></div></div><div className="card"><h3>Cloudflare secrets</h3><p>Use scripts/secrets/push-cloudflare-secrets.sh after decrypting .env.local.</p></div>
    </div>
  </>;
}

export function RouteGuide({ purpose, primaryAction, secondary, caution }: { purpose: string; primaryAction: string; secondary?: string; caution?: string }) {
  return <section className="route-guide" aria-label="Route guidance"><div><span>Purpose</span><strong>{purpose}</strong></div><div><span>Primary action</span><strong>{primaryAction}</strong></div>{secondary && <div><span>Secondary</span><strong>{secondary}</strong></div>}{caution && <div className="route-caution"><span>Guardrail</span><strong>{caution}</strong></div>}</section>;
}

function humanize(value: unknown) { return String(value || '').replaceAll('_', ' ').replace(/\b\w/g, (char) => char.toUpperCase()); }
function friendlyWhen(value: unknown) { const date = new Date(String(value || '')); return Number.isNaN(date.getTime()) ? String(value || 'Not scheduled') : date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: date.getFullYear() !== new Date().getFullYear() ? 'numeric' : undefined }); }
function relativeWhen(value: unknown) { const date = new Date(String(value || '')); if (Number.isNaN(date.getTime())) return ''; const days = Math.floor((Date.now() - date.getTime()) / 86400000); if (days <= 0) return 'Today'; if (days === 1) return 'Yesterday'; if (days < 7) return `${days} days ago`; return friendlyWhen(value); }
function humanizeList(value: unknown) { return String(value || '').split(',').map((item) => humanize(item.trim())).filter(Boolean).join(', '); }
function bounded(value: unknown, max: number) { const text = displayText(value); return text.length > max ? `${text.slice(0, max).trim()}…` : text; }

export function Header({ eyebrow, title, subtitle }: { eyebrow: string; title: string; subtitle: string }) {
  return <div className="topbar"><div><div className="eyebrow">{eyebrow}</div><h1>{title}</h1><p className="subtitle">{subtitle}</p></div></div>;
}
