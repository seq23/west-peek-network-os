#!/usr/bin/env bash
set -Eeuo pipefail
source "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/common.sh"
if [[ ! -f "$AUTH_STATE_LOCAL_PATH" ]]; then "$AUTH_STATE_ROOT/scripts/auth-state/restore.sh"; fi
validate_auth_state "$AUTH_STATE_LOCAL_PATH"
export TIER4_AUTHENTICATED_STORAGE_STATE="$AUTH_STATE_LOCAL_PATH"
export PLAYWRIGHT_STORAGE_STATE="$AUTH_STATE_LOCAL_PATH"
export POSTDEPLOY_BASE_URL="${POSTDEPLOY_BASE_URL:-https://network.joinwestpeek.com}"
export PLAYWRIGHT_BASE_URL="${PLAYWRIGHT_BASE_URL:-$POSTDEPLOY_BASE_URL}"
exec node scripts/testing/fixtures/cleanup-historical-tier4.mjs
