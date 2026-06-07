import { cookieHeader, redirect, requireAuthEnv, createSignedValue, type AuthEnv } from '../_shared/auth';

type Context = { request: Request; env: AuthEnv };

const scopes = [
  'openid',
  'email',
  'profile',
  'https://www.googleapis.com/auth/gmail.readonly'
];

export async function onRequestGet({ request, env }: Context) {
  requireAuthEnv(env);
  const url = new URL(request.url);
  const next = url.searchParams.get('next') || '/';

  const statePayload = {
    nonce: crypto.randomUUID(),
    created_at: Date.now(),
    next
  };
  const state = await createSignedValue(env.APP_SESSION_SECRET || '', statePayload);

  const google = new URL('https://accounts.google.com/o/oauth2/v2/auth');
  google.searchParams.set('client_id', env.GOOGLE_CLIENT_ID || '');
  google.searchParams.set('redirect_uri', env.GOOGLE_REDIRECT_URI || '');
  google.searchParams.set('response_type', 'code');
  google.searchParams.set('scope', scopes.join(' '));
  google.searchParams.set('access_type', 'offline');
  google.searchParams.set('prompt', 'consent');
  google.searchParams.set('state', state);

  return redirect(google.toString(), {
    'set-cookie': cookieHeader('wpn_oauth_state', state, 600)
  });
}
