#!/usr/bin/env node
import { read, failOrPass } from './_validation-utils.mjs';
const failures = [];
const start = read('functions/auth/google.ts', failures);
const callback = read('functions/auth/callback/google.ts', failures);
const auth = read('functions/_shared/auth.ts', failures);
const status = read('functions/api/oauth/status.ts', failures);
if (!/wpn_oauth_state/.test(start) || !/createSignedValue/.test(start)) failures.push('Google OAuth start route must create a signed state cookie.');
if (!/gmail\.readonly/.test(start)) failures.push('OAuth scope must include Gmail readonly proof lane unless intentionally changed.');
if (!/returnedState/.test(callback) || !/cookieState/.test(callback) || !/verifySignedValue/.test(callback)) failures.push('OAuth callback must validate returned state against signed cookie state.');
if (!/isAllowedEmail/.test(callback) || !/approved for West Peek Network OS/.test(callback)) failures.push('OAuth callback must enforce ADMIN_EMAIL_ALLOWLIST with controlled disallowed-account message.');
if (!/encryptTokenPayload/.test(callback) || !/appendRecord\(env, 'oauth_tokens'/.test(callback)) failures.push('OAuth callback must encrypt and persist Google token to oauth_tokens.');
if (!/sheetsUnavailable/.test(callback)) failures.push('OAuth callback must map Sheets/private-key failures through sheetsUnavailable.');
if (!/HttpOnly; Secure; SameSite=Lax/.test(auth)) failures.push('Session cookie must be HttpOnly, Secure, SameSite=Lax.');
if (!/browser_session_connected/.test(status) || !/gmail_oauth_connected/.test(status)) failures.push('OAuth status route must expose browser session and Gmail connection status.');
failOrPass('validate-oauth-connect-contract', failures);
