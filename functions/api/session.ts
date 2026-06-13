import { json } from '../_shared/json';
import { authenticatedUserEmail, type AuthEnv } from '../_shared/auth';

type Context = { request: Request; env: AuthEnv };

export async function onRequest({ request, env }: Context) {
  const email = await authenticatedUserEmail(request, env);
  const authenticated = Boolean(email);

  return json({
    authenticated,
    user: authenticated ? { email, role: 'Admin' } : null,
    authModel: 'Google OAuth allowlist with signed session cookie. Header spoofing is not accepted in production.'
  }, { status: authenticated ? 200 : 401, headers: { 'cache-control': 'no-store' } });
}
