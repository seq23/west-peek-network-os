#!/usr/bin/env bash
set -Eeuo pipefail
mkdir -p artifacts/diagnostics/hallmark
npm run validate:deployed-route-manifest
if [[ -n "${HALLMARK_RUNNER:-}" && -x "${HALLMARK_RUNNER}" ]]; then
  "${HALLMARK_RUNNER}"
else
  printf '{"verdict":"BLOCKED","reason":"HALLMARK_RUNNER unavailable in current environment"}
' > artifacts/diagnostics/hallmark/summary.json
  echo 'HALLMARK BLOCKED — configured Hallmark evidence runner is required before deployment.' >&2
  exit 2
fi
