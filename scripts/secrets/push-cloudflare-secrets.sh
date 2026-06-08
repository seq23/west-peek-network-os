#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
ENV_FILE="$ROOT_DIR/.env.local"
KEY_FILE="$ROOT_DIR/scripts/secrets/required-keys.txt"

if [[ ! -f "$ENV_FILE" ]]; then
  echo "Missing .env.local. Run scripts/secrets/decrypt-local-env.sh first." >&2
  exit 1
fi

if [[ ! -f "$KEY_FILE" ]]; then
  echo "Missing required key list: $KEY_FILE" >&2
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

while IFS= read -r key; do
  [[ -z "$key" || "$key" == \#* ]] && continue

  value="${!key:-}"
  if [[ -z "$value" ]]; then
    echo "Skip: $key is empty or unset"
    continue
  fi

  printf '%s' "$value" | npx wrangler pages secret put "$key" --project-name "$PROJECT_NAME"
  echo "Pushed Cloudflare secret: $key"
done < "$KEY_FILE"

echo "Cloudflare secret push completed. Secret values were not printed by this script."
