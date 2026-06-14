#!/usr/bin/env bash
set -Eeuo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
REPORT="${TIER4_LATEST_REPORT:-$ROOT/reports/tier4/tier4-ultimate-live-proof.json}"
if [[ ! -f "$REPORT" ]]; then
  echo "ERROR: latest Tier 4 report not found: $REPORT" >&2
  echo "Run npm run release:live-proof first or set TIER4_LATEST_REPORT to the exact report JSON." >&2
  exit 1
fi
RUN_ID="$(node -e 'const fs=require("fs");const p=process.argv[1];const j=JSON.parse(fs.readFileSync(p,"utf8"));if(!/^wpno-tier4-[A-Za-z0-9._:-]+$/.test(j.runId||""))process.exit(2);process.stdout.write(j.runId)' "$REPORT")" || {
  echo "ERROR: report does not contain a valid wpno-tier4 runId: $REPORT" >&2
  exit 1
}
export WEST_PEEK_E2E_RUN_ID="$RUN_ID"
echo "Latest Tier 4 proof run: $RUN_ID"
exec bash "$ROOT/scripts/auth-state/cleanup-tier4.sh" "$RUN_ID"
