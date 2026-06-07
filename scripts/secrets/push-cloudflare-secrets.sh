#!/usr/bin/env bash
set -euo pipefail
ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
ENV_FILE="$ROOT_DIR/.env.local"
if [[ ! -f "$ENV_FILE" ]]; then
  echo "Missing .env.local. Run scripts/secrets/decrypt-local-env.sh first." >&2
  exit 1
fi
if ! command -v npx >/dev/null 2>&1; then
  echo "npx is required to run Wrangler." >&2
  exit 1
fi
set -a
# shellcheck disable=SC1090
source "$ENV_FILE"
set +a
PROJECT_NAME="${CLOUDFLARE_PROJECT_NAME:-west-peek-network-os}"
APPROVED_KEYS=(
  APP_SESSION_SECRET
  ADMIN_EMAIL_ALLOWLIST
  GOOGLE_CLIENT_ID
  GOOGLE_CLIENT_SECRET
  GOOGLE_REDIRECT_URI
  GOOGLE_SHEET_ID
  GOOGLE_SERVICE_ACCOUNT_EMAIL
  GOOGLE_PRIVATE_KEY
  GOOGLE_PRIVATE_KEY_ID
  GMAIL_TRIGGER_PHRASE
  ACCEPTED_TRIGGER_ALIASES
  TOKEN_ENCRYPTION_SECRET
  ANTHROPIC_API_KEY
  AI_PROVIDER
  HANDWRITTEN_VENDOR
  HANDWRITTEN_VENDOR_API_KEY
  HANDWRITTEN_VENDOR_BASE_URL
  DEFAULT_HANDWRITTEN_CARD_ID
  DEFAULT_HANDWRITING_STYLE_ID
  DEFAULT_RETURN_ADDRESS_ID
  DEFAULT_HANDWRITTEN_NOTE_VENDOR_NAME
  DEFAULT_HANDWRITTEN_NOTE_VENDOR_URL
  NOTIFICATION_EMAIL_FROM
  TRANSACTIONAL_EMAIL_PROVIDER
  RESEND_API_KEY
  APP_BASE_URL
)
for key in "${APPROVED_KEYS[@]}"; do
  value="${!key:-}"
  if [[ -z "$value" ]]; then
    echo "Skip: $key is empty or unset"
    continue
  fi
  printf '%s' "$value" | npx wrangler pages secret put "$key" --project-name "$PROJECT_NAME"
  echo "Pushed Cloudflare secret: $key"
done
echo "Cloudflare secret push completed. Secret values were not printed by this script."
