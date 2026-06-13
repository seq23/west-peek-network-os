#!/usr/bin/env bash
set -Eeuo pipefail

AUTH_STATE_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd -P)"
AUTH_STATE_LOCAL_PATH="${AUTH_STATE_LOCAL_PATH:-$AUTH_STATE_ROOT/.auth/playwright-storage-state.json}"
AUTH_STATE_VAULT_PATH="${AUTH_STATE_VAULT_PATH:-$HOME/AI_AUTH_VAULTS/west-peek-network-os/playwright-storage-state.json.gpg}"
AUTH_STATE_EXPECTED_DOMAIN="${AUTH_STATE_EXPECTED_DOMAIN:-network.joinwestpeek.com}"

fail(){ printf 'ERROR: %s\n' "$*" >&2; exit 1; }
require_command(){ command -v "$1" >/dev/null 2>&1 || fail "required command not found: $1"; }

validate_auth_state(){
  local file="$1"
  AUTH_STATE_EXPECTED_DOMAIN="$AUTH_STATE_EXPECTED_DOMAIN" node - "$file" <<'NODE'
const fs = require('node:fs');
const file = process.argv[2];
let value;
try { value = JSON.parse(fs.readFileSync(file, 'utf8')); }
catch { console.error('ERROR: auth state is not valid JSON.'); process.exit(1); }
if (!value || !Array.isArray(value.cookies) || !Array.isArray(value.origins)) {
  console.error('ERROR: auth state must contain cookies[] and origins[].');
  process.exit(1);
}
const session = value.cookies.find((cookie) => cookie && cookie.name === 'wpn_session');
if (!session || typeof session.value !== 'string' || !session.value) {
  console.error('ERROR: auth state does not contain a non-empty wpn_session cookie.');
  process.exit(1);
}
const domain = String(session.domain || '').replace(/^\./, '').toLowerCase();
const expectedDomain = String(process.env.AUTH_STATE_EXPECTED_DOMAIN || 'network.joinwestpeek.com').replace(/^\./, '').toLowerCase();
if (!(domain === expectedDomain || domain.endsWith(`.${expectedDomain}`))) {
  console.error(`ERROR: wpn_session cookie is not scoped to expected domain ${expectedDomain}.`);
  process.exit(1);
}
const now = Date.now() / 1000;
if (typeof session.expires === 'number' && session.expires > 0 && session.expires <= now) {
  console.error('ERROR: wpn_session cookie is expired.');
  process.exit(1);
}
console.log(`PASS authenticated storage-state contract (${value.cookies.length} cookies; values not printed)`);
NODE
}
