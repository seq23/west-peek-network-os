#!/usr/bin/env bash
set -Eeuo pipefail

source "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/common.sh"

if [[ ! -f "$AUTH_STATE_LOCAL_PATH" ]]; then
  "$AUTH_STATE_ROOT/scripts/auth-state/restore.sh"
fi

validate_auth_state "$AUTH_STATE_LOCAL_PATH"

export TIER4_AUTHENTICATED_STORAGE_STATE="$AUTH_STATE_LOCAL_PATH"
export PLAYWRIGHT_STORAGE_STATE="$AUTH_STATE_LOCAL_PATH"
export POSTDEPLOY_BASE_URL="${POSTDEPLOY_BASE_URL:-https://network.joinwestpeek.com}"
export PLAYWRIGHT_BASE_URL="${PLAYWRIGHT_BASE_URL:-$POSTDEPLOY_BASE_URL}"

RUN_ID="${WEST_PEEK_E2E_RUN_ID:-${1:-}}"

if [[ ! "$RUN_ID" =~ ^wpno-tier4-[A-Za-z0-9._:-]+$ ]]; then
  echo "ERROR: supply the exact Tier 4 run ID: npm run tier4:physical-delete -- wpno-tier4-..." >&2
  exit 1
fi

export WEST_PEEK_E2E_RUN_ID="$RUN_ID"

exec node scripts/testing/fixtures/physical-delete-tier4.mjs
