import { json } from '../_shared/json';

const allowedUsers = ['sequoia@westpeek.ventures', 'scooter@westpeek.ventures'];

export async function onRequest({ request }: { request: Request }) {
  const claimedEmail = request.headers.get('x-west-peek-user-email') || '';
  const authenticated = allowedUsers.includes(claimedEmail.toLowerCase());
  return json({
    authenticated,
    user: authenticated ? { email: claimedEmail.toLowerCase(), role: 'Admin' } : null,
    approvedUsers: allowedUsers,
    authModel: 'Google OAuth allowlist; this endpoint exposes the runtime session shape and rejects non-allowlisted emails.'
  }, { status: authenticated ? 200 : 401 });
}
