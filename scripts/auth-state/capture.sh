#!/usr/bin/env bash
set -Eeuo pipefail
source "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd -P)/common.sh"

require_command node
require_command npx

AUTH_CAPTURE_URL="${AUTH_CAPTURE_URL:-https://network.joinwestpeek.com}"
AUTH_CAPTURE_OVERWRITE="${AUTH_CAPTURE_OVERWRITE:-0}"

case "$AUTH_CAPTURE_URL" in
  https://*) ;;
  *) fail "AUTH_CAPTURE_URL must be an explicit deployed HTTPS URL." ;;
esac

if [[ -e "$AUTH_STATE_LOCAL_PATH" && "$AUTH_CAPTURE_OVERWRITE" != "1" ]]; then
  fail "local auth state already exists: $AUTH_STATE_LOCAL_PATH. Set AUTH_CAPTURE_OVERWRITE=1 only when intentionally refreshing it."
fi

local_dir="$(dirname "$AUTH_STATE_LOCAL_PATH")"
mkdir -p "$local_dir"
chmod 700 "$local_dir"

tmp_state="$(mktemp "$local_dir/.playwright-storage-state.capture.XXXXXX")"
cleanup(){ rm -f "$tmp_state"; }
trap cleanup EXIT
chmod 600 "$tmp_state"
rm -f "$tmp_state"

printf '%s\n' "Opening Playwright against: $AUTH_CAPTURE_URL"
printf '%s\n' "Complete Google authentication, wait for the authenticated dashboard, then close the Playwright browser window."
printf '%s\n' "Cookie and session values will not be printed."

npx playwright codegen --save-storage="$tmp_state" "$AUTH_CAPTURE_URL"

[[ -s "$tmp_state" ]] || fail "Playwright closed without writing authenticated storage state."
chmod 600 "$tmp_state"
validate_auth_state "$tmp_state"
mv -f "$tmp_state" "$AUTH_STATE_LOCAL_PATH"
chmod 600 "$AUTH_STATE_LOCAL_PATH"
trap - EXIT

printf '%s\n' "Authenticated storage state captured: $AUTH_STATE_LOCAL_PATH"
printf '%s\n' "Next: npm run auth:backup"
