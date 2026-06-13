#!/usr/bin/env bash
set -Eeuo pipefail
source "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/common.sh"
require_command gpg
[[ -f "$AUTH_STATE_VAULT_PATH" ]] || fail "encrypted auth-state vault not found: $AUTH_STATE_VAULT_PATH"
mkdir -p "$(dirname "$AUTH_STATE_LOCAL_PATH")"
chmod 700 "$(dirname "$AUTH_STATE_LOCAL_PATH")"
tmp="${AUTH_STATE_LOCAL_PATH}.tmp.$$"
trap 'rm -f "$tmp"' EXIT
if [[ -n "${AUTH_STATE_VAULT_PASSPHRASE:-}" ]]; then
  gpg --batch --yes --quiet --pinentry-mode loopback --passphrase-fd 3 --decrypt "$AUTH_STATE_VAULT_PATH" 3<<<"$AUTH_STATE_VAULT_PASSPHRASE" > "$tmp"
else
  gpg --quiet --decrypt "$AUTH_STATE_VAULT_PATH" > "$tmp"
fi
chmod 600 "$tmp"
validate_auth_state "$tmp"
mv -f "$tmp" "$AUTH_STATE_LOCAL_PATH"
trap - EXIT
printf 'AUTH STATE RESTORE COMPLETE\nLocal path: %s\nSecret values: NOT PRINTED\n' "$AUTH_STATE_LOCAL_PATH"
