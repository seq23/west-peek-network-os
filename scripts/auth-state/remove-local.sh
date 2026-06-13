#!/usr/bin/env bash
set -Eeuo pipefail
source "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/common.sh"
rm -f "$AUTH_STATE_LOCAL_PATH"
rmdir "$(dirname "$AUTH_STATE_LOCAL_PATH")" 2>/dev/null || true
printf 'LOCAL AUTH STATE REMOVED\nCanonical encrypted vault preserved: %s\n' "$AUTH_STATE_VAULT_PATH"
