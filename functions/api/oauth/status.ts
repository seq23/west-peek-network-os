import { json } from '../../_shared/json';
import { authenticatedUserEmail, type AuthEnv } from '../../_shared/auth';
import { readTab, type RuntimeEnv } from '../../_shared/sheets';

type Env = RuntimeEnv & AuthEnv;
type Context = { request: Request; env: Env };

type OAuthStatusPayload = {
  ok: boolean;
  browser_session_connected: boolean;
  browser_session_email: string;
  gmail_oauth_connected: boolean;
  connected_email: string;
  provider: string;
  status: string;
  token_captured_at: string;
  token_updated_at: string;
  source: string;
  cache_ttl_seconds: number;
  warning?: string;
  error?: string;
};

type CacheEntry = { payload: OAuthStatusPayload; expiresAt: number };
const oauthStatusCache = new Map<string, CacheEntry>();
const CACHE_TTL_MS = 75_000;

export async function onRequest({ request, env }: Context) {
  const sessionEmail = await authenticatedUserEmail(request, env);
  const cacheKey = `${env.GOOGLE_SHEET_ID || 'sheet'}:${sessionEmail || 'any-approved-user'}`;
  const cached = oauthStatusCache.get(cacheKey);

  if (cached && Date.now() < cached.expiresAt) {
    return json({ ...cached.payload, source: `${cached.payload.source}:memory_cache` }, {
      headers: { 'cache-control': 'private, max-age=45' }
    });
  }

  try {
    // OAuth status is read-only, but it must still fail closed on schema mismatch.
    const rows = await readTab(env, 'oauth_tokens');

    const activeRows = rows
      .filter((row) => String(row.provider || '').toLowerCase() === 'google')
      .filter((row) => String(row.status || '').toLowerCase() === 'active')
      .sort((a, b) => String(b.created_at || '').localeCompare(String(a.created_at || '')));

    const matchingRows = sessionEmail
      ? activeRows.filter((row) => String(row.user_email || '').toLowerCase() === sessionEmail.toLowerCase())
      : activeRows;

    const latest = matchingRows[0] || activeRows[0] || null;
    const payload: OAuthStatusPayload = {
      ok: true,
      browser_session_connected: Boolean(sessionEmail),
      browser_session_email: sessionEmail || '',
      gmail_oauth_connected: Boolean(latest),
      connected_email: latest ? String(latest.user_email || '') : '',
      provider: latest ? String(latest.provider || 'google') : 'google',
      status: latest ? String(latest.status || '') : 'not_connected',
      token_captured_at: latest ? String(latest.created_at || '') : '',
      token_updated_at: latest ? String(latest.updated_at || '') : '',
      source: 'oauth_tokens:schema_validated_read',
      cache_ttl_seconds: CACHE_TTL_MS / 1000
    };

    oauthStatusCache.set(cacheKey, { payload, expiresAt: Date.now() + CACHE_TTL_MS });
    return json(payload, { headers: { 'cache-control': 'private, max-age=45' } });
  } catch (error) {
    const detail = error instanceof Error ? error.message : 'Could not read OAuth status.';
    if (cached) {
      return json({
        ...cached.payload,
        ok: true,
        warning: `Using cached OAuth status because Google Sheets returned: ${detail}`,
        source: `${cached.payload.source}:stale_after_error`
      }, { headers: { 'cache-control': 'private, max-age=30' } });
    }

    const rateLimited = detail.includes('429') || detail.includes('RATE_LIMIT') || detail.includes('RESOURCE_EXHAUSTED');
    return json({
      ok: false,
      browser_session_connected: Boolean(sessionEmail),
      browser_session_email: sessionEmail || '',
      gmail_oauth_connected: false,
      connected_email: '',
      provider: 'google',
      status: rateLimited ? 'temporarily_rate_limited' : 'unknown',
      token_captured_at: '',
      token_updated_at: '',
      source: 'oauth_tokens:error_no_cache',
      cache_ttl_seconds: 0,
      error: rateLimited ? 'Google Sheets quota cooldown. Wait 60 seconds before refreshing connection status again.' : detail
    }, { status: rateLimited ? 200 : 503, headers: { 'cache-control': 'private, max-age=60' } });
  }
}
