import { authenticatedUserEmail, type AuthEnv } from './_shared/auth';

type Context = { request: Request; env: AuthEnv; next: () => Promise<Response> };

const PUBLIC_PREFIXES = [
  '/auth/google',
  '/auth/callback/google',
  '/api/health',
  '/api/session',
  '/api/intake/pitch-lab',
  '/api/intake/pitch-lab-profile',
  // The sheet door for every West Peek website form (functions/api/intake/
  // site-form.ts). It is called server-to-server by functions/api/lead.js in
  // join-west-peek-main with the shared secret as its gate - there is no
  // session. It was missing here, so this middleware answered every site-form
  // POST 401 "Authentication required." before the handler ran, and no
  // website submission ever reached the contacts tab while /api/health said
  // ready:true. Measured 28 Sep 2026 on a joinwestpeek.com preview:
  // {"ok":true,"sheet":"failed"}. tests/domain/site-form-intake.mjs now
  // drives this middleware for both directions.
  '/api/intake/site-form',
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
