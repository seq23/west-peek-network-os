import { json } from './json';

export interface AuthEnv {
  ADMIN_EMAIL_ALLOWLIST?: string;
  APP_SESSION_SECRET?: string;
  GOOGLE_CLIENT_ID?: string;
  GOOGLE_CLIENT_SECRET?: string;
  GOOGLE_REDIRECT_URI?: string;
  TOKEN_ENCRYPTION_SECRET?: string;
}

export function allowedEmails(env: AuthEnv) {
  return String(env.ADMIN_EMAIL_ALLOWLIST || '')
    .split(',')
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);
}

export function isAllowedEmail(env: AuthEnv, email: string) {
  return allowedEmails(env).includes(email.trim().toLowerCase());
}

export function getCookie(request: Request, name: string) {
  const cookie = request.headers.get('cookie') || '';
  for (const part of cookie.split(';')) {
    const [rawKey, ...rawValue] = part.trim().split('=');
    if (rawKey === name) return decodeURIComponent(rawValue.join('='));
  }
  return '';
}

export function cookieHeader(name: string, value: string, maxAgeSeconds: number) {
  return `${name}=${encodeURIComponent(value)}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${maxAgeSeconds}`;
}

export function clearCookieHeader(name: string) {
  return `${name}=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0`;
}

export function redirect(location: string, headers: HeadersInit = {}) {
  return new Response(null, { status: 302, headers: { location, ...headers } });
}

export function badRequest(message: string, status = 400) {
  return json({ ok: false, error: message }, { status });
}

export function requireAuthEnv(env: AuthEnv) {
  const missing = [
    'ADMIN_EMAIL_ALLOWLIST',
    'APP_SESSION_SECRET',
    'GOOGLE_CLIENT_ID',
    'GOOGLE_CLIENT_SECRET',
    'GOOGLE_REDIRECT_URI',
    'TOKEN_ENCRYPTION_SECRET'
  ].filter((key) => !env[key as keyof AuthEnv]);

  if (missing.length) throw new Error(`OAuth runtime is not configured. Missing: ${missing.join(', ')}`);
}


export async function authenticatedUserEmail(request: Request, env: AuthEnv, options: { allowHeaderFallback?: boolean } = {}) {
  const approvedUsers = allowedEmails(env);
  const sessionCookie = getCookie(request, 'wpn_session');

  let sessionEmail = '';
  if (sessionCookie && env.APP_SESSION_SECRET) {
    const payload = await verifySignedValue(env.APP_SESSION_SECRET, sessionCookie);
    sessionEmail = typeof payload?.email === 'string' ? payload.email.toLowerCase() : '';
  }

  const localHeaderFallbackAllowed = options.allowHeaderFallback === true && isLocalOperatorRequest(request);
  const headerEmail = localHeaderFallbackAllowed ? (request.headers.get('x-west-peek-user-email') || '').toLowerCase() : '';
  const email = sessionEmail || headerEmail;
  if (!email || !approvedUsers.includes(email)) return '';
  return email;
}

export async function requireAuthenticatedUser(request: Request, env: AuthEnv, options: { allowHeaderFallback?: boolean } = {}) {
  const email = await authenticatedUserEmail(request, env, options);
  if (!email) throw new Error('Authentication required. Connect with Google first.');
  return { email, role: 'Admin' };
}

export async function createSignedValue(secret: string, payload: Record<string, unknown>) {
  const encodedPayload = base64Url(JSON.stringify(payload));
  const signature = await hmac(secret, encodedPayload);
  return `${encodedPayload}.${signature}`;
}

export async function verifySignedValue(secret: string, signedValue: string) {
  const [encodedPayload, signature] = signedValue.split('.');
  if (!encodedPayload || !signature) return null;
  const expected = await hmac(secret, encodedPayload);
  if (!timingSafeEqual(signature, expected)) return null;
  try {
    return JSON.parse(new TextDecoder().decode(base64UrlDecode(encodedPayload))) as Record<string, unknown>;
  } catch {
    return null;
  }
}

async function hmac(secret: string, value: string) {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const signature = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(value));
  return base64UrlBytes(new Uint8Array(signature));
}

function timingSafeEqual(a: string, b: string) {
  if (a.length !== b.length) return false;
  let result = 0;
  for (let index = 0; index < a.length; index += 1) result |= a.charCodeAt(index) ^ b.charCodeAt(index);
  return result === 0;
}

function base64Url(input: string) {
  return base64UrlBytes(new TextEncoder().encode(input));
}

function base64UrlBytes(input: Uint8Array) {
  let binary = '';
  for (const byte of input) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function base64UrlDecode(input: string) {
  const padded = input.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat((4 - input.length % 4) % 4);
  const binary = atob(padded);
  return Uint8Array.from(binary, (char) => char.charCodeAt(0));
}

function isLocalOperatorRequest(request: Request) {
  const url = new URL(request.url);
  const host = url.hostname.toLowerCase();
  return host === 'localhost' || host === '127.0.0.1' || host.endsWith('.local');
}
