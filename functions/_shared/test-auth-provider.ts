export type RuntimeTestAuthEnv = {
  AUTH_PROVIDER?: string;
  APP_ENV?: string;
  ADMIN_EMAIL_ALLOWLIST?: string;
  APP_SESSION_SECRET?: string;
};

export function testAuthEmail(request: Request, env: RuntimeTestAuthEnv) {
  if (String(env.AUTH_PROVIDER || '').toLowerCase() !== 'test') return '';
  const url = new URL(request.url);
  const hostname = url.hostname.toLowerCase();
  const local = hostname === 'localhost' || hostname === '127.0.0.1' || hostname.endsWith('.local');
  if (String(env.APP_ENV || '').toLowerCase() !== 'test' || !local) {
    throw new Error('SECURITY_TEST_AUTH_FORBIDDEN_OUTSIDE_LOCAL_TEST_RUNTIME');
  }
  const persona = String(request.headers.get('x-west-peek-test-persona') || '').toLowerCase();
  if (!persona || persona === 'unauthenticated' || persona === 'expired' || persona === 'revoked') return '';
  if (persona !== 'operator') throw new Error(`Unsupported test-auth persona: ${persona}`);
  return 'operator@westpeek.test';
}
