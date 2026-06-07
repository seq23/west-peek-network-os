import { appendRecord, sheetsUnavailable, type RuntimeEnv } from '../../_shared/sheets';
import { badRequest, clearCookieHeader, cookieHeader, getCookie, isAllowedEmail, redirect, requireAuthEnv, verifySignedValue, createSignedValue, type AuthEnv } from '../../_shared/auth';
import { encryptTokenPayload } from '../../_shared/tokens';

type Env = RuntimeEnv & AuthEnv;
type Context = { request: Request; env: Env };

type GoogleTokenPayload = {
  access_token?: string;
  refresh_token?: string;
  expires_in?: number;
  scope?: string;
  token_type?: string;
  id_token?: string;
};

type GoogleUserInfo = {
  email?: string;
  email_verified?: boolean;
  name?: string;
  picture?: string;
};

export async function onRequestGet({ request, env }: Context) {
  try {
    requireAuthEnv(env);
  } catch (error) {
    return badRequest(error instanceof Error ? error.message : 'OAuth runtime is not configured.', 503);
  }

  const url = new URL(request.url);
  const code = url.searchParams.get('code') || '';
  const returnedState = url.searchParams.get('state') || '';
  const cookieState = getCookie(request, 'wpn_oauth_state');

  if (!code) return badRequest('Missing Google OAuth code.');
  if (!returnedState || !cookieState || returnedState !== cookieState) return badRequest('Invalid OAuth state.', 401);

  const verifiedState = await verifySignedValue(env.APP_SESSION_SECRET || '', returnedState);
  if (!verifiedState) return badRequest('OAuth state signature failed.', 401);
  if (typeof verifiedState.created_at === 'number' && Date.now() - verifiedState.created_at > 10 * 60 * 1000) {
    return badRequest('OAuth state expired.', 401);
  }

  const token = await exchangeCodeForToken(env, code);
  const userInfo = await fetchUserInfo(token.access_token || '');
  const email = String(userInfo.email || '').toLowerCase();

  if (!email || userInfo.email_verified === false) return badRequest('Google account email is missing or unverified.', 401);
  if (!isAllowedEmail(env, email)) return badRequest('Google account is not approved for West Peek Network OS.', 403);

  const encrypted = await encryptTokenPayload(env, token);
  const now = new Date().toISOString();
  const tokenRecord = {
    token_id: `oauth_${Date.now()}_${crypto.randomUUID().slice(0, 8)}`,
    created_at: now,
    updated_at: now,
    provider: 'google',
    user_email: email,
    scope: token.scope || '',
    token_type: token.token_type || '',
    expires_in: token.expires_in || '',
    encrypted_payload: encrypted.ciphertext,
    encryption_iv: encrypted.iv,
    encryption_algorithm: encrypted.algorithm,
    status: 'active'
  };

  try {
    await appendRecord(env, 'oauth_tokens', tokenRecord);
  } catch (error) {
    return sheetsUnavailable(error);
  }

  const session = await createSignedValue(env.APP_SESSION_SECRET || '', {
    email,
    role: 'Admin',
    authenticated_at: Date.now()
  });

  return redirect('/?connected=google', {
    'set-cookie': [
      clearCookieHeader('wpn_oauth_state'),
      cookieHeader('wpn_session', session, 60 * 60 * 24 * 7)
    ].join(', ')
  });
}

async function exchangeCodeForToken(env: Env, code: string): Promise<GoogleTokenPayload> {
  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id: env.GOOGLE_CLIENT_ID || '',
      client_secret: env.GOOGLE_CLIENT_SECRET || '',
      redirect_uri: env.GOOGLE_REDIRECT_URI || '',
      grant_type: 'authorization_code'
    })
  });

  if (!response.ok) throw new Error(`Google token exchange failed: ${response.status} ${await response.text()}`);
  return response.json();
}

async function fetchUserInfo(accessToken: string): Promise<GoogleUserInfo> {
  if (!accessToken) throw new Error('Google token response did not include access_token.');
  const response = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
    headers: { Authorization: `Bearer ${accessToken}` }
  });
  if (!response.ok) throw new Error(`Google userinfo failed: ${response.status} ${await response.text()}`);
  return response.json();
}
