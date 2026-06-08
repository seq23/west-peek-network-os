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

missing=0
while IFS= read -r key; do
  [[ -z "$key" || "$key" == \#* ]] && continue

  if ! grep -qE "^${key}=" "$ENV_FILE"; then
    echo "Missing required key: $key" >&2
    missing=1
  else
    value="$(grep -E "^${key}=" "$ENV_FILE" | head -n 1 | cut -d= -f2-)"
    lower_value="$(printf '%s' "$value" | tr '[:upper:]' '[:lower:]')"
    if [[ -z "$value" || "$lower_value" == *"replace-with"* || "$lower_value" == *"change-me"* || "$lower_value" == *"local-only"* || "$lower_value" == *"example"* ]]; then
      echo "Placeholder or empty value must be replaced: $key" >&2
      missing=1
    else
      echo "Present: $key"
    fi
  fi
done < "$KEY_FILE"

if [[ "$missing" -ne 0 ]]; then
  exit 1
fi

echo "Secret key presence and placeholder check passed. Values were not printed."
