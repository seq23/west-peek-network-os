#!/usr/bin/env bash
set -Eeuo pipefail
source "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/common.sh"
require_command gpg
[[ -f "$AUTH_STATE_LOCAL_PATH" ]] || fail "local auth state not found: $AUTH_STATE_LOCAL_PATH"
validate_auth_state "$AUTH_STATE_LOCAL_PATH"
mkdir -p "$(dirname "$AUTH_STATE_VAULT_PATH")"
chmod 700 "$(dirname "$AUTH_STATE_VAULT_PATH")"
tmp="${AUTH_STATE_VAULT_PATH}.tmp.$$"
trap 'rm -f "$tmp"' EXIT
if [[ -n "${AUTH_STATE_VAULT_PASSPHRASE:-}" ]]; then
  gpg --batch --yes --quiet --symmetric --cipher-algo AES256 --pinentry-mode loopback --passphrase-fd 3 --output "$tmp" "$AUTH_STATE_LOCAL_PATH" 3<<<"$AUTH_STATE_VAULT_PASSPHRASE"
else
  gpg --yes --quiet --symmetric --cipher-algo AES256 --output "$tmp" "$AUTH_STATE_LOCAL_PATH"
fi
chmod 600 "$tmp"
mv -f "$tmp" "$AUTH_STATE_VAULT_PATH"
trap - EXIT
printf 'AUTH STATE BACKUP COMPLETE\nVault: %s\nSecret values: NOT PRINTED\n' "$AUTH_STATE_VAULT_PATH"
