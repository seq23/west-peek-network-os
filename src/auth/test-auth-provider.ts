export type TestAuthPersona = 'operator' | 'unauthenticated' | 'expired' | 'revoked';

export type TestAuthSession = {
  authenticated: boolean;
  email?: string;
  role?: 'Admin';
  reason?: 'unauthenticated' | 'expired' | 'revoked';
};

export function assertTestAuthActivation(input: {
  nodeEnv?: string;
  authProvider?: string;
  hostname?: string;
}) {
  const nodeEnv = String(input.nodeEnv || '').toLowerCase();
  const authProvider = String(input.authProvider || '').toLowerCase();
  const hostname = String(input.hostname || '').toLowerCase();
  const localHost = hostname === 'localhost' || hostname === '127.0.0.1' || hostname.endsWith('.local');
  if (authProvider !== 'test') throw new Error('Test auth requires AUTH_PROVIDER=test.');
  if (nodeEnv !== 'test') throw new Error('Test auth requires NODE_ENV=test.');
  if (!localHost) throw new Error('Test auth requires a local/test hostname.');
}

export function createTestAuthSession(persona: TestAuthPersona): TestAuthSession {
  if (persona === 'operator') return { authenticated: true, email: 'operator@westpeek.test', role: 'Admin' };
  return { authenticated: false, reason: persona };
}
