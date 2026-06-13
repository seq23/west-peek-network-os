#!/usr/bin/env bash
set -Eeuo pipefail
source "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/common.sh"
if [[ ! -f "$AUTH_STATE_LOCAL_PATH" ]]; then "$AUTH_STATE_ROOT/scripts/auth-state/restore.sh"; fi
validate_auth_state "$AUTH_STATE_LOCAL_PATH"
HALLMARK_RUNNER="${HALLMARK_RUNNER:-$HOME/run_hallmark_audit.sh}"
[[ -x "$HALLMARK_RUNNER" ]] || fail "Hallmark runner not executable: $HALLMARK_RUNNER"
"$HALLMARK_RUNNER" --help 2>&1 | grep -q -- "--storage-state" || fail "Hallmark runner does not support --storage-state: $HALLMARK_RUNNER"
BASE_URL="${HALLMARK_BASE_URL:-https://west-peek-network-os.pages.dev}"
exec "$HALLMARK_RUNNER" "$AUTH_STATE_ROOT" --base-url "$BASE_URL" --storage-state "$AUTH_STATE_LOCAL_PATH" "$@"
