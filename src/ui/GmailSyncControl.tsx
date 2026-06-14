import { useRef, useState } from 'react';

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
    const notConnected: string[] = [];
    const failures: string[] = [];
    let imported = 0;
    let duplicates = 0;
    let failedMessages = 0;

    try {
      for (const mailbox of ALLOWED_MAILBOXES) {
        try {
          const response = await fetch('/api/gmail/sync', {
            method: 'POST',
            credentials: 'same-origin',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ mailbox_email: mailbox, max_results: 25 })
          });
          const payload = await response.json().catch(() => ({})) as MailboxSyncResult;
          if (response.status === 409 && payload.error_code === 'MAILBOX_NOT_CONNECTED') {
            notConnected.push(mailbox);
            continue;
          }
          if (!response.ok || !payload.ok) {
            failures.push(`${mailbox}: ${payload.error || payload.error_code || `HTTP ${response.status}`}`);
            continue;
          }
          const reportedMailbox = String(payload.mailbox || mailbox).toLowerCase();
          if (reportedMailbox !== mailbox) {
            failures.push(`${mailbox}: server reported unexpected mailbox ${reportedMailbox}`);
            continue;
          }
          connected.push(mailbox);
          imported += Number(payload.imported_count || 0);
          duplicates += Number(payload.skipped_duplicate_count || 0);
          failedMessages += Number(payload.failed_message_count || 0);
        } catch (error) {
          failures.push(`${mailbox}: ${error instanceof Error ? error.message : 'network request failed'}`);
        }
      }

      if (connected.length === 0) {
        const detail = failures.length ? ` ${failures.join(' | ')}` : '';
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
      const skipped = notConnected.length ? ` Not connected: ${notConnected.join(', ')}.` : '';
      const errors = failures.length ? ` Errors: ${failures.join(' | ')}.` : '';
      setStatus(`Gmail sync complete. Checked: ${checked}. Imported ${imported}; duplicates skipped ${duplicates}; message failures ${failedMessages}.${skipped}${errors}${refreshError}`);
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
