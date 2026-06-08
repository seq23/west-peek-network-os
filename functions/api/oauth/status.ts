import { json } from '../../_shared/json';
import { authenticatedUserEmail, type AuthEnv } from '../../_shared/auth';
import { readTab, type RuntimeEnv } from '../../_shared/sheets';

type Env = RuntimeEnv & AuthEnv;
type Context = { request: Request; env: Env };

export async function onRequest({ request, env }: Context) {
  try {
    const sessionEmail = await authenticatedUserEmail(request, env);
    const rows = await readTab(env, 'oauth_tokens');

    const activeRows = rows
      .filter((row) => String(row.provider || '').toLowerCase() === 'google')
      .filter((row) => String(row.status || '').toLowerCase() === 'active')
      .sort((a, b) => String(b.created_at || '').localeCompare(String(a.created_at || '')));

    const matchingRows = sessionEmail
      ? activeRows.filter((row) => String(row.user_email || '').toLowerCase() === sessionEmail.toLowerCase())
      : activeRows;

    const latest = matchingRows[0] || activeRows[0] || null;

    return json({
      ok: true,
      browser_session_connected: Boolean(sessionEmail),
      browser_session_email: sessionEmail || '',
      gmail_oauth_connected: Boolean(latest),
      connected_email: latest ? String(latest.user_email || '') : '',
      provider: latest ? String(latest.provider || 'google') : 'google',
      status: latest ? String(latest.status || '') : 'not_connected',
      token_captured_at: latest ? String(latest.created_at || '') : '',
      token_updated_at: latest ? String(latest.updated_at || '') : '',
      source: 'oauth_tokens'
    });
  } catch (error) {
    return json({
      ok: false,
      gmail_oauth_connected: false,
      error: error instanceof Error ? error.message : 'Could not read OAuth status.'
    }, { status: 503 });
  }
}
