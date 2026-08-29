#!/usr/bin/env node
// Shared diagnostics for the release self-heal loop and the post-deploy
// remediation planner.
//
// Both consumers used to classify a failure by substring-matching `auth`
// anywhere in captured output. Routine schema text — `authMode`, `author`,
// `authenticated` — therefore read as an authorization incident, which in the
// post-deploy planner escalated a benign manifest typo to SEV-1 /
// ROLLBACK_OR_CONTAIN_BEFORE_REPAIR. Matching is now anchored to the tokens an
// actual authorization failure emits.
import { execFileSync } from 'node:child_process';
import fs from 'node:fs/promises';
import crypto from 'node:crypto';

// Real authorization failures announce themselves with a status code or a
// standalone word. `authMode`/`author`/`authenticated` deliberately do not match.
export const AUTHORIZATION_SIGNAL =
  /\b(401|403)\b|\bunauthorized\b|\bforbidden\b|\bpermission denied\b|\baccess denied\b|\bnot authorized\b|\binvalid credentials\b|\bmissing credentials\b/i;

export function isAuthorizationFailure(text) {
  return AUTHORIZATION_SIGNAL.test(String(text ?? ''));
}

export function classify(result) {
  const text = `${result.stdout ?? ''}\n${result.stderr ?? ''}`;
  if (isAuthorizationFailure(text)) return 'AUTHORIZATION';
  if (/typecheck|typescript|\bTS\d+\b/i.test(text)) return 'TYPE_SYSTEM';
  if (/\b(build|compile|webpack|vite|next)\b/i.test(text)) return 'BUILD';
  if (/\b(test|assert|vitest|playwright)\b/i.test(text)) return 'TEST';
  if (/\b(audit|vulnerab\w*|CVE)\b/i.test(text)) return 'SECURITY';
  return result.code === 0 ? 'PASS' : 'UNKNOWN';
}

// The old tree hash walked the working directory with a hard-coded ignore list.
// Build caches that the repo gitignores but that list does not know about —
// `tsconfig.tsbuildinfo` is the one that bit us — changed between the before and
// after hashes, so the report claimed "Source changed: true" on runs that
// modified zero source files. `changed` is the loop's ONLY evidence that it
// repaired anything, so it is now computed over git-tracked files only.
export function trackedFiles(cwd = process.cwd()) {
  const out = execFileSync('git', ['ls-files', '-z', '--cached', '--others', '--exclude-standard'], {
    cwd,
    encoding: 'utf8',
    maxBuffer: 64 * 1024 * 1024
  });
  return out.split('\0').filter(Boolean).sort();
}

export async function treeHash(cwd = process.cwd()) {
  const files = trackedFiles(cwd);
  if (!files.length) {
    throw new Error('self-heal treeHash examined zero tracked files; refusing to report a source hash it cannot compute');
  }
  const h = crypto.createHash('sha256');
  for (const f of files) {
    h.update(f);
    try {
      h.update(await fs.readFile(`${cwd}/${f}`));
    } catch {
      // A tracked path that has been deleted is itself a change; record the
      // absence rather than silently hashing the same value as "present".
      h.update('\0<missing>');
    }
  }
  return h.digest('hex');
}
