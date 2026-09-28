import { json, readJson } from '../../_shared/json';
import { appendRecord, readTab } from '../../_shared/sheets';
import { decryptTokenPayload } from '../../_shared/tokens';
import { actor, introRows, contacts, formatError, fail, validEmail, type IntroContext } from '../../_shared/introductions';
import type { AuthEnv } from '../../_shared/auth';

type Guard = { idFromName(name: string): unknown; get(id: unknown): { fetch(request: Request): Promise<Response> } };
type Env = IntroContext['env'] & AuthEnv & { INTRO_SEND_GUARD?: Guard };
type Payload = { access_token?: string; refresh_token?: string; scope?: string };
const SEND_SCOPE = 'https://www.googleapis.com/auth/gmail.send';
function wireText(text: string) { return text.replace(/\r?\n/g, '\r\n'); }
function encode(raw: string) { const bytes = new TextEncoder().encode(raw); let binary = ''; for (const byte of bytes) binary += String.fromCharCode(byte); return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, ''); }
async function fingerprint(raw: string) { const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(raw)); return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, '0')).join(''); }
export async function onRequestPost({ request, env }: { request: Request; env: Env }) {
  try {
    const user = await actor(request, env);
    const { intro_id } = await readJson<{ intro_id?: string }>(request);
    if (!env.INTRO_SEND_GUARD) return fail('In-app sending is not configured: the durable send guard is missing.', 503);
    const allIntros = await introRows(env);
    const intro = allIntros.find((row) => row.intro_id === intro_id);
    if (!intro) return fail('Introduction not found.', 404);
    const askFirst = intro.etiquette === 'ask_first';
    if (askFirst ? !['approved', 'permission_confirmed'].includes(String(intro.status)) : intro.status !== 'approved') return fail('This introduction is not ready to send.', 409);
    const stage = askFirst && intro.status === 'approved' ? 'permission' : 'introduction';
    const dayStart = new Date().toISOString().slice(0, 10);
    if (allIntros.filter((row) => row.status === 'sent' && row.sent_from === user && String(row.sent_at || '').startsWith(dayStart)).length >= 10) return fail('Daily in-app introduction limit reached (10 per operator).', 429);
    const approval = (await readTab(env, 'approvals')).filter((row) => row.approval_id === intro.approval_id).at(-1);
    if (!approval || approval.status !== 'approved' || approval.source_entity_id !== intro_id || approval.approved_by !== intro.approved_by) return fail('Receiving-side owner approval could not be verified.', 409);
    const people = await contacts(env);
    const b = people.find((person) => person.contact_id === intro.person_b_id);
    const a = String(intro.person_a_id || '').startsWith('external:') ? null : people.find((person) => person.contact_id === intro.person_a_id);
    if (!b || b.status !== 'active' || (a && a.status !== 'active') || [a,b].some((person) => person && String(person.tags || '').toLowerCase().includes('no-intros')) || !validEmail(b.email) || !validEmail(intro.person_a_email) || String(b.email).toLowerCase() !== String(intro.person_b_email).toLowerCase() || (a && String(a.email).toLowerCase() !== String(intro.person_a_email).toLowerCase())) return fail('Recipient details changed. Review this introduction again.', 409);
    const to = stage === 'permission' ? [String(b.email)] : [String(intro.person_a_email), String(b.email)];
    if (new Set(to.map((mail) => mail.toLowerCase())).size !== to.length) return fail('Two distinct people are required.', 409);
    const subject = String(stage === 'permission' ? intro.ask_first_subject : intro.draft_subject);
    const body = String(stage === 'permission' ? intro.ask_first_body : intro.draft_body);
    if (!subject || !body || subject.length > 200 || body.length > 4000 || /[\r\n]/.test(subject)) return fail('Approved message is incomplete.', 409);
    const rows = (await readTab(env, 'oauth_tokens')).filter((row) => row.provider === 'google' && row.status === 'active' && String(row.user_email).toLowerCase() === user.toLowerCase() && String(row.scope).split(' ').includes(SEND_SCOPE));
    const token = rows.at(-1);
    if (!token) return fail('Connect your own Gmail account again to grant in-app sending.', 409);
    const payload = await decryptTokenPayload<Payload>(env, String(token.encrypted_payload), String(token.encryption_iv));
    if (!String(payload.scope || token.scope).split(' ').includes(SEND_SCOPE)) return fail('Gmail send permission is missing. Reconnect Gmail.', 409);
    let accessToken = payload.access_token || '';
    if (payload.refresh_token) {
      if (!env.GOOGLE_CLIENT_ID || !env.GOOGLE_CLIENT_SECRET) return fail('Gmail token refresh is not configured.', 503);
      const response = await fetch('https://oauth2.googleapis.com/token', { method: 'POST', headers: { 'content-type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams({ client_id: env.GOOGLE_CLIENT_ID, client_secret: env.GOOGLE_CLIENT_SECRET, refresh_token: payload.refresh_token, grant_type: 'refresh_token' }) });
      if (!response.ok) return fail('Could not refresh Gmail authorization. Reconnect Gmail.', 409);
      const refreshed = await response.json() as Payload;
      accessToken = refreshed.access_token || '';
    }
    if (!accessToken) return fail('Gmail access is unavailable. Reconnect Gmail.', 409);
    const claimId = `${intro_id}:${stage}`;
    const hash = await fingerprint(JSON.stringify({ claimId, user, to, subject, body, approval: intro.approval_id }));
    const guard = env.INTRO_SEND_GUARD.get(env.INTRO_SEND_GUARD.idFromName(claimId));
    const claim = await guard.fetch(new Request('https://intro-send-guard/claim', { method: 'POST', body: JSON.stringify({ action: 'claim', fingerprint: hash }) }));
    if (!claim.ok) return fail('This send has already been attempted. Review its outcome before taking another action.', 409);
    const messageId = `<wpn-${intro_id.replace(/[^a-zA-Z0-9.-]/g, '')}-${stage}@westpeek.ventures>`;
    const raw = ['From: ' + user, 'To: ' + to.join(', '), 'Subject: ' + subject, 'Message-ID: ' + messageId, 'MIME-Version: 1.0', 'Content-Type: text/plain; charset=UTF-8', 'Content-Transfer-Encoding: 8bit', '', wireText(body)].join('\r\n');
    let result: { id?: string; threadId?: string } = {};
    try {
      const response = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', { method: 'POST', headers: { authorization: `Bearer ${accessToken}`, 'content-type': 'application/json' }, body: JSON.stringify({ raw: encode(raw) }) });
      if (!response.ok) throw new Error(`Gmail returned ${response.status}`);
      result = await response.json() as typeof result;
      if (!result.id) throw new Error('Gmail did not return a message identifier');
      const completed = await guard.fetch(new Request('https://intro-send-guard/complete', { method: 'POST', body: JSON.stringify({ action: 'complete', fingerprint: hash, result }) }));
      if (!completed.ok) throw new Error('Send receipt could not be persisted');
    } catch {
      const uncertain = { ...intro, status: 'send_uncertain', send_error: `Gmail outcome is uncertain for ${stage}; check the sent mailbox before resolving. Message-ID: ${messageId}`, updated_at: new Date().toISOString(), updated_by: user };
      await appendRecord(env, 'introductions', uncertain).catch(() => undefined);
      return fail('Send outcome is uncertain. Check your Gmail Sent folder; this action cannot be retried automatically.', 503);
    }
    const now = new Date().toISOString();
    const next = { ...intro, status: stage === 'permission' ? 'permission_sent' : 'sent', permission_sent_at: stage === 'permission' ? now : intro.permission_sent_at, sent_at: stage === 'introduction' ? now : intro.sent_at, sent_from: user, gmail_message_id: result.id, gmail_thread_id: result.threadId || '', updated_at: now, updated_by: user };
    try { await appendRecord(env, 'introductions', next); } catch { return fail('Gmail accepted the message, but the history update failed. Check Gmail Sent before proceeding; this send cannot be retried.', 503); }
    let historyWarning = '';
    if (stage === 'introduction') {
      for (const [contactId, recipientName, recipientEmail] of [[intro.person_a_id, intro.person_a_name, intro.person_a_email], [intro.person_b_id, intro.person_b_name, intro.person_b_email]]) {
        try {
          const touchId = `touch_intro_${crypto.randomUUID()}`;
          await appendRecord(env, 'relationship_touches', { touch_id: touchId, created_at: now, updated_at: now, contact_id: contactId, contact_email: recipientEmail, recipient_name: recipientName, recipient_email: recipientEmail, owner: user, reason: `Introduction ${intro_id}`, status: 'sent', method: 'email', email_subject: subject, email_body: body, approval_required: true, execution_allowed: false, sent_at: now, created_by: user, updated_by: user });
        } catch { historyWarning = 'Gmail sent the introduction; a relationship touch could not be recorded. Check the touch history.'; }
      }
    }
    return json({ ok: true, introduction: next, gmail_message_id: result.id, warning: historyWarning });
  } catch (error) { return formatError(error); }
}
