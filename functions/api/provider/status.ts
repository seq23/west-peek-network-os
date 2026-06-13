import { authenticatedUserEmail, type AuthEnv } from '../../_shared/auth';
import { json } from '../../_shared/json';

type Env = AuthEnv & Record<string, string | undefined>;
type Context = { request: Request; env: Env };

export async function onRequestGet({ request, env }: Context) {
  const email = await authenticatedUserEmail(request, env);
  if (!email) return json({ ok: false, error: 'Authentication required.' }, { status: 401 });
  const configured = (keys: string[]) => keys.every((key) => Boolean(env[key]));
  return json({
    ok: true,
    user_email: email,
    providers: {
      google_oauth: { status: configured(['GOOGLE_CLIENT_ID', 'GOOGLE_CLIENT_SECRET', 'GOOGLE_REDIRECT_URI']) ? 'configured' : 'missing_env', proves: 'OAuth config presence only; connect flow still requires browser proof.' },
      gmail_sync: { status: configured(['GOOGLE_CLIENT_ID', 'GOOGLE_CLIENT_SECRET', 'TOKEN_ENCRYPTION_SECRET']) ? 'implemented_requires_oauth_token' : 'missing_env', endpoint: '/api/gmail/sync' },
      google_sheets: { status: configured(['GOOGLE_SHEET_ID', 'GOOGLE_SERVICE_ACCOUNT_EMAIL', 'GOOGLE_PRIVATE_KEY']) ? 'configured' : 'missing_env' },
      anthropic: { status: configured(['ANTHROPIC_API_KEY']) ? 'configured' : 'missing_env' },
      google_speech: { status: configured(['GOOGLE_CLOUD_PROJECT_ID', 'GOOGLE_SERVICE_ACCOUNT_EMAIL', 'GOOGLE_PRIVATE_KEY']) ? 'configured' : 'missing_env' },
      pitch_lab: { status: configured(['PITCH_LAB_SHARED_SECRET']) ? 'configured' : 'missing_env' }
    },
    secret_values_exposed: false
  }, { headers: { 'cache-control': 'no-store' } });
}
