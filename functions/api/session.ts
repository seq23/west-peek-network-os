import { json } from '../_shared/json';
import { allowedEmails, getCookie, verifySignedValue, type AuthEnv } from '../_shared/auth';

type Context = { request: Request; env: AuthEnv };

export async function onRequest({ request, env }: Context) {
  const approvedUsers = allowedEmails(env);
  const claimedEmail = request.headers.get('x-west-peek-user-email') || '';
  const sessionCookie = getCookie(request, 'wpn_session');

  let sessionEmail = '';
  if (sessionCookie && env.APP_SESSION_SECRET) {
    const payload = await verifySignedValue(env.APP_SESSION_SECRET, sessionCookie);
    sessionEmail = typeof payload?.email === 'string' ? payload.email.toLowerCase() : '';
  }

  const email = sessionEmail || claimedEmail.toLowerCase();
  const authenticated = approvedUsers.includes(email);

  return json({
    authenticated,
    user: authenticated ? { email, role: 'Admin' } : null,
    approvedUsers,
    authModel: 'Google OAuth allowlist with signed session cookie; local header fallback remains for operator testing.'
  }, { status: authenticated ? 200 : 401 });
}
