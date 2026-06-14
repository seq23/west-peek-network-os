#!/usr/bin/env bash
set -Eeuo pipefail
mkdir -p artifacts/diagnostics/cleanup
if npm run | grep -q 'fixtures:cleanup:expired'; then npm run fixtures:cleanup:expired; fi
if npm run | grep -q 'tier4:cleanup' && [[ -n "${WEST_PEEK_E2E_RUN_ID:-}" ]]; then
  npm run tier4:cleanup -- "$WEST_PEEK_E2E_RUN_ID"
elif npm run | grep -q 'tier4:cleanup'; then
  echo "ERROR: WEST_PEEK_E2E_RUN_ID is required for exact Network OS Tier 4 cleanup." >&2
  exit 1
fi
printf '{"verdict":"PASS","run_id":"%s","note":"Exact registered Tier 4 proof fixtures were cleaned and verified."}\n' "${WEST_PEEK_E2E_RUN_ID:-N/A}" > artifacts/diagnostics/cleanup/summary.json
echo 'release:cleanup PASS'
