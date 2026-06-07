#!/usr/bin/env bash
set -euo pipefail
ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
ENV_FILE="$ROOT_DIR/.env.local"
REQUIRED_KEYS=(
  APP_SESSION_SECRET
  ADMIN_EMAIL_ALLOWLIST
  GOOGLE_CLIENT_ID
  GOOGLE_CLIENT_SECRET
  GOOGLE_REDIRECT_URI
  GOOGLE_SHEET_ID
  GOOGLE_SERVICE_ACCOUNT_EMAIL
  GOOGLE_PRIVATE_KEY
  GOOGLE_CLOUD_PROJECT_ID
  GMAIL_TRIGGER_PHRASE
  ACCEPTED_TRIGGER_ALIASES
  TOKEN_ENCRYPTION_SECRET
  ANTHROPIC_API_KEY
  APP_BASE_URL
  CLOUDFLARE_PROJECT_NAME
)
if [[ ! -f "$ENV_FILE" ]]; then
  echo "Missing .env.local. Run scripts/secrets/decrypt-local-env.sh first." >&2
  exit 1
fi
missing=0
for key in "${REQUIRED_KEYS[@]}"; do
  if ! grep -qE "^${key}=" "$ENV_FILE"; then
    echo "Missing required key: $key" >&2
    missing=1
  else
    value="$(grep -E "^${key}=" "$ENV_FILE" | head -n 1 | cut -d= -f2-)"
    lower_value="$(printf '%s' "$value" | tr '[:upper:]' '[:lower:]')"
    if [[ "$lower_value" == *"replace-with"* || "$lower_value" == *"change-me"* || "$lower_value" == *"local-only"* || "$lower_value" == *"example"* ]]; then
      echo "Placeholder value must be replaced: $key" >&2
      missing=1
    else
      echo "Present: $key"
    fi
  fi
done
if [[ "$missing" -ne 0 ]]; then
  exit 1
fi
echo "Secret key presence and placeholder check passed. Values were not printed."
