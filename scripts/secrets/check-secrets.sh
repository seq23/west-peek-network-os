#!/usr/bin/env bash
set -euo pipefail
ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
ENV_FILE="$ROOT_DIR/.env.local"
REQUIRED_KEYS=(
  APP_SESSION_SECRET
  ADMIN_EMAIL_ALLOWLIST
  GOOGLE_CLIENT_ID
  GOOGLE_CLIENT_SECRET
  GOOGLE_SHEET_ID
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
    echo "Present: $key"
  fi
done
if [[ "$missing" -ne 0 ]]; then
  exit 1
fi
echo "Secret key presence check passed. Values were not printed."
