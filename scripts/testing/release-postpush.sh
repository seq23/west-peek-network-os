#!/usr/bin/env bash
set -Eeuo pipefail
command -v gh >/dev/null 2>&1 || { echo 'ERROR: gh CLI is required' >&2; exit 1; }
SHA="$(git rev-parse HEAD)"
WAIT_SECONDS="${POSTPUSH_WAIT_SECONDS:-900}"
POLL_SECONDS="${POSTPUSH_POLL_SECONDS:-15}"
START="$(date +%s)"
while true; do
  JSON="$(gh run list --commit "$SHA" --limit 20 --json databaseId,name,status,conclusion,url,headSha)"
  COUNT="$(node -e 'const x=JSON.parse(process.argv[1]);process.stdout.write(String(x.length))' "$JSON")"
  BAD="$(node -e 'const x=JSON.parse(process.argv[1]);process.stdout.write(String(x.filter(r=>r.status==="completed"&&r.conclusion!=="success").length))' "$JSON")"
  PENDING="$(node -e 'const x=JSON.parse(process.argv[1]);process.stdout.write(String(x.filter(r=>r.status!=="completed").length))' "$JSON")"
  echo "$JSON" | node -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>{for(const r of JSON.parse(s))console.log(`${r.name}: ${r.status}/${r.conclusion||"pending"} ${r.url}`)})'
  [[ "$BAD" == 0 ]] || { echo 'POSTDEPLOY PROOF FAILED — GitHub Actions failure' >&2; exit 1; }
  [[ "$COUNT" -gt 0 && "$PENDING" == 0 ]] && break
  (( $(date +%s) - START < WAIT_SECONDS )) || { echo 'POSTDEPLOY PROOF INCOMPLETE — workflow timeout' >&2; exit 2; }
  sleep "$POLL_SECONDS"
done
if [[ -z "${POSTDEPLOY_BASE_URL:-}" ]]; then
  echo 'POSTDEPLOY PROOF INCOMPLETE — POSTDEPLOY_BASE_URL is required for deployed runtime proof.' >&2
  exit 2
fi
npm run validate:postdeploy:strict
printf '%s\n' 'POSTDEPLOY PROOF PASSED'
