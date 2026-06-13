#!/usr/bin/env bash
set -Eeuo pipefail
source "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/common.sh"
printf 'Canonical vault: %s\n' "$AUTH_STATE_VAULT_PATH"
if [[ -f "$AUTH_STATE_VAULT_PATH" ]]; then printf 'Vault: PRESENT\n'; else printf 'Vault: MISSING\n'; fi
printf 'Local state: %s\n' "$AUTH_STATE_LOCAL_PATH"
if [[ -f "$AUTH_STATE_LOCAL_PATH" ]]; then
  validate_auth_state "$AUTH_STATE_LOCAL_PATH"
  printf 'Local state: READY\n'
else
  printf 'Local state: MISSING\n'
fi
