import { authenticatedUserEmail, type AuthEnv } from './_shared/auth';

type Context = { request: Request; env: AuthEnv; next: () => Promise<Response> };

const PUBLIC_PREFIXES = [
  '/auth/google',
  '/auth/callback/google',
  '/api/health',
  '/api/session',
  '/api/intake/pitch-lab',
  '/api/intake/pitch-lab-profile',
  '/api/triggers/check',
  '/e/',
  '/assets/'
];
const PUBLIC_FILES = new Set(['/favicon.ico', '/wp-logo.jpg', '/robots.txt']);

export async function onRequest({ request, env, next }: Context) {
  const url = new URL(request.url);
  if (isPublicPath(url.pathname)) return next();

  const email = await authenticatedUserEmail(request, env);
  if (email) return next();

  if (request.method === 'GET' && acceptsHtml(request)) {
    const target = new URL('/auth/google', url.origin);
    target.searchParams.set('next', `${url.pathname}${url.search}`);
    return Response.redirect(target.toString(), 302);
  }

  return new Response(JSON.stringify({ ok: false, error: 'Authentication required.' }), {
    status: 401,
    headers: { 'content-type': 'application/json', 'cache-control': 'no-store' }
  });
}

function isPublicPath(pathname: string) {
  if (PUBLIC_FILES.has(pathname)) return true;
  return PUBLIC_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(prefix));
}

function acceptsHtml(request: Request) {
  return (request.headers.get('accept') || '').includes('text/html');
}
