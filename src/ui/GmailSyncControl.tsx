import { useRef, useState } from 'react';

const MAX_BATCHES_PER_MAILBOX = 20;

const ALLOWED_MAILBOXES = [
  'info@westpeek.ventures',
  'sequoia@westpeek.ventures',
  'scooter@westpeek.ventures'
] as const;

type MailboxSyncResult = {
  ok?: boolean;
  mailbox?: string;
  imported_count?: number;
  skipped_duplicate_count?: number;
  failed_message_count?: number;
  error_code?: string;
  error?: string;
  mailbox_connected?: boolean;
  has_more?: boolean;
  next_page_token?: string;
  sync_started_at?: string;
  skipped_tier4_count?: number;
};

export function GmailSyncControl({ authenticated, onRefresh, compact = false }: { authenticated: boolean; onRefresh: () => Promise<unknown> | void; compact?: boolean }) {
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState('');
  const runningRef = useRef(false);

  async function syncAllConnectedMailboxes() {
    if (runningRef.current) return;
    if (!authenticated) {
      setStatus('Sign in first, then connect Gmail in Settings.');
      return;
    }

    runningRef.current = true;
    setBusy(true);
    setStatus('Checking connected West Peek Gmail mailboxes…');
    const connected: string[] = [];
    const connectedFailures: string[] = [];
    const notConnected: string[] = [];
    const failures: string[] = [];
    let imported = 0;
    let duplicates = 0;
    let failedMessages = 0;
    let rejectedTier4 = 0;

    try {
      for (const mailbox of ALLOWED_MAILBOXES) {
        let pageToken = '';
        let mailboxConnected = false;
        let mailboxFailed = false;
        let batches = 0;
        let syncStartedAt = '';
        const seenPageTokens = new Set<string>();

        do {
          batches += 1;
          try {
            const response = await fetch('/api/gmail/sync', {
              method: 'POST',
              credentials: 'same-origin',
              headers: { 'content-type': 'application/json' },
              body: JSON.stringify({ mailbox_email: mailbox, max_results: 5 })
            });
            const payload = await response.json().catch(() => ({})) as MailboxSyncResult;
            if (response.status === 409 && payload.error_code === 'MAILBOX_NOT_CONNECTED') {
              notConnected.push(mailbox);
              break;
            }
            if (payload.mailbox_connected) mailboxConnected = true;
            if (!response.ok || !payload.ok) {
              const detail = payload.error || payload.error_code || `HTTP ${response.status}`;
              failures.push(`${mailbox}: ${detail}`);
              // Only an explicit MAILBOX_NOT_CONNECTED response proves disconnection.
              // Provider/network/Worker failures are sync failures for the requested mailbox,
              // even when an upstream-generated response omits mailbox_connected.
              connectedFailures.push(mailbox);
              mailboxFailed = true;
              break;
            }
            const reportedMailbox = String(payload.mailbox || mailbox).toLowerCase();
            if (reportedMailbox !== mailbox) {
              failures.push(`${mailbox}: server reported unexpected mailbox ${reportedMailbox}`);
              connectedFailures.push(mailbox);
              mailboxFailed = true;
              break;
            }
            mailboxConnected = true;
            syncStartedAt = String(payload.sync_started_at || syncStartedAt);
            imported += Number(payload.imported_count || 0);
            duplicates += Number(payload.skipped_duplicate_count || 0);
            failedMessages += Number(payload.failed_message_count || 0);
            rejectedTier4 += Number(payload.skipped_tier4_count || 0);
            const nextPageToken = payload.has_more ? String(payload.next_page_token || '') : '';
            if (payload.has_more && !nextPageToken) {
              failures.push(`${mailbox}: server reported more Gmail results without a continuation token`);
              connectedFailures.push(mailbox);
              mailboxFailed = true;
              break;
            }
            if (nextPageToken && seenPageTokens.has(nextPageToken)) {
              failures.push(`${mailbox}: Gmail returned a repeated continuation token; sync stopped to prevent a loop`);
              connectedFailures.push(mailbox);
              mailboxFailed = true;
              break;
            }
            if (nextPageToken) seenPageTokens.add(nextPageToken);
            pageToken = nextPageToken;
          } catch (error) {
            failures.push(`${mailbox}: ${error instanceof Error ? error.message : 'network request failed'}`);
            connectedFailures.push(mailbox);
            mailboxFailed = true;
            break;
          }
        } while (pageToken && batches < MAX_BATCHES_PER_MAILBOX);

        if (pageToken && batches >= MAX_BATCHES_PER_MAILBOX) {
          failures.push(`${mailbox}: sync paused after ${MAX_BATCHES_PER_MAILBOX} bounded batches; click Sync again to resume from the saved Gmail cursor`);
          connectedFailures.push(mailbox);
          mailboxFailed = true;
        }
        if (mailboxConnected && !mailboxFailed) connected.push(mailbox);
      }

      const uniqueConnectedFailures = [...new Set(connectedFailures)];
      if (connected.length === 0 && uniqueConnectedFailures.length > 0) {
        const skipped = notConnected.length ? ` Not connected: ${notConnected.join(', ')}.` : '';
        setStatus(`Connected Gmail mailbox sync failed. Affected: ${uniqueConnectedFailures.join(', ')}. Errors: ${failures.join(' | ')}.${skipped}`);
        return;
      }
      if (connected.length === 0) {
        const detail = failures.length ? ` Errors: ${failures.join(' | ')}.` : '';
        setStatus(`No eligible Gmail mailbox is connected. Connect info@westpeek.ventures, sequoia@westpeek.ventures, or scooter@westpeek.ventures in Settings.${detail}`);
        return;
      }

      let refreshError = '';
      try {
        await onRefresh();
      } catch (error) {
        refreshError = ` Intake refresh failed: ${error instanceof Error ? error.message : 'unknown refresh error'}.`;
      }
      const checked = connected.join(', ');
      const partial = uniqueConnectedFailures.length ? ` Connected but failed: ${uniqueConnectedFailures.join(', ')}.` : '';
      const skipped = notConnected.length ? ` Not connected: ${notConnected.join(', ')}.` : '';
      const errors = failures.length ? ` Errors: ${failures.join(' | ')}.` : '';
      setStatus(`Gmail sync complete. Checked: ${checked}. Imported ${imported}; duplicates skipped ${duplicates}; proof fixtures rejected ${rejectedTier4}; message failures ${failedMessages}.${partial}${skipped}${errors}${refreshError}`);
    } catch (error) {
      setStatus(`Gmail sync failed before completion: ${error instanceof Error ? error.message : 'unknown error'}.`);
    } finally {
      runningRef.current = false;
      setBusy(false);
    }
  }

  return <div className={compact ? 'gmail-sync-control compact' : 'gmail-sync-control'}>
    <button className="btn primary" type="button" disabled={busy || !authenticated} onClick={syncAllConnectedMailboxes}>
      {busy ? 'Syncing Gmail…' : 'Sync new emails from Gmail'}
    </button>
    {status && <p className="operation-result" aria-live="polite">{status}</p>}
  </div>;
}
