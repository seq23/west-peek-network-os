#!/usr/bin/env bash
set -Eeuo pipefail
mkdir -p logs artifacts/diagnostics
export NODE_OPTIONS="${NODE_OPTIONS:---max-old-space-size=3072}"
GAPS=()
run(){ local id="$1"; shift; echo "==> $id"; "$@" 2>&1 | tee "logs/deep-validation-${id}.log"; }
run secret-policy npm run validate:secret-policy
run fast npm run verify:fast
run admitted-local npm run validate:all
set +e
npm run test:environment-doctor 2>&1 | tee logs/deep-validation-environment-doctor.log
DOCTOR_STATUS=${PIPESTATUS[0]}
set -e
if [[ "$DOCTOR_STATUS" -eq 0 ]]; then
  run e2e-container npm run test:e2e:container
elif [[ "$DOCTOR_STATUS" -eq 20 ]] && grep -q 'ENVIRONMENT_DOCTOR_CLASSIFICATION=BROWSER_UNAVAILABLE' logs/deep-validation-environment-doctor.log; then
  GAPS+=("PLAYWRIGHT_BROWSER_UNAVAILABLE")
  echo 'ENVIRONMENT GAP: browser proof skipped because Chromium is not installed or cannot launch.'
else
  echo 'DEEP VALIDATION BLOCKED — environment doctor found a non-browser configuration defect.' >&2
  exit 1
fi
if [[ ! -f dist/index.html ]]; then run build npm run build; else echo '==> build already proven by validate:all; dist/index.html present'; fi
rm -rf dist reports playwright-report test-results coverage .open-next .next out build tsconfig.tsbuildinfo
run generated-artifacts npm run validate:no-generated-artifacts
run docs npm run validate:docs-match-package-scripts
run matrix npm run validate:repo-matrix-consistency
run fixture-clean npm run fixtures:verify-clean
if ((${#GAPS[@]})); then
  printf 'DEEP VALIDATION PASSED WITH ENVIRONMENT GAPS: %s\n' "${GAPS[*]}"
else
  printf '%s\n' 'DEEP VALIDATION PASSED'
fi
printf '%s\n' 'LIVE PROVIDERS, GITHUB, CLOUDFLARE DEPLOYMENT, AND HEADED HUMAN REVIEW NOT PROVEN'
