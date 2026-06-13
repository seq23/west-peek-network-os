#!/usr/bin/env bash
set -Eeuo pipefail
source "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/common.sh"
if [[ ! -f "$AUTH_STATE_LOCAL_PATH" ]]; then "$AUTH_STATE_ROOT/scripts/auth-state/restore.sh"; fi
validate_auth_state "$AUTH_STATE_LOCAL_PATH"
export TIER4_AUTHENTICATED_STORAGE_STATE="$AUTH_STATE_LOCAL_PATH"
export PLAYWRIGHT_STORAGE_STATE="$AUTH_STATE_LOCAL_PATH"
export POSTDEPLOY_BASE_URL="${POSTDEPLOY_BASE_URL:-https://network.joinwestpeek.com}"
export PLAYWRIGHT_BASE_URL="${PLAYWRIGHT_BASE_URL:-$POSTDEPLOY_BASE_URL}"
export SMOKE_BASE_URL="${SMOKE_BASE_URL:-$POSTDEPLOY_BASE_URL}"
export TIER4_ULTIMATE_LIVE_PROOF=1
export WEST_PEEK_E2E_RUN_ID="${WEST_PEEK_E2E_RUN_ID:-wpno-tier4-$(date -u +%Y%m%dT%H%M%SZ)}"
printf 'TIER 4 AUTHENTICATED PREFLIGHT\n'
printf 'Storage state: READY\n'
printf 'Deployment URL: %s\n' "$POSTDEPLOY_BASE_URL"
printf 'Gmail live lane: %s\n' "$([[ "${LIVE_GMAIL_TRIGGER_E2E:-0}" == 1 ]] && echo ENABLED || echo NOT ENABLED)"
printf 'Google Sheets live lane: %s\n' "$([[ "${GOOGLE_SHEETS_LIVE_E2E:-0}" == 1 ]] && echo ENABLED || echo NOT ENABLED)"
printf 'Pitch Lab secret: %s\n' "$([[ -n "${PITCH_LAB_SHARED_SECRET:-}" ]] && echo PRESENT || echo MISSING)"
printf 'AI/OCR/voice mode: %s\n' "$([[ "${TIER4_AI_OCR_VOICE_E2E:-0}" == 1 ]] && echo LIVE || ([[ "${TIER4_ALLOW_CONTROLLED_UNAVAILABLE:-0}" == 1 ]] && echo CONTROLLED_UNAVAILABLE || echo NOT ENABLED))"
printf 'Operator Gmail seeds are still required for the Gmail lane. Secret values are not printed.\n'
exec npm run tier4:ultimate-live-proof
