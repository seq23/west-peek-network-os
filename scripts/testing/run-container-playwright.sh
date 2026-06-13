#!/usr/bin/env bash
set -Eeuo pipefail
ENV_FILE=.env.test
[[ -f "$ENV_FILE" ]] || ENV_FILE=.env.test.example
if [[ -f "$ENV_FILE" ]]; then
  set -a
  # shellcheck disable=SC1090
  source "$ENV_FILE"
  set +a
fi
export CI=true HEADLESS=true PLAYWRIGHT_BASE_URL="${PLAYWRIGHT_BASE_URL:-http://127.0.0.1:3000}"
if [[ "${PLAYWRIGHT_INSTALL_BROWSER:-0}" == "1" ]]; then
  if [[ "$(uname -s)" == Linux ]]; then
    npx playwright install --with-deps chromium
  else
    npx playwright install chromium
  fi
fi
npm run test:environment-doctor
npx playwright test --config=playwright.container.config.ts "$@"
