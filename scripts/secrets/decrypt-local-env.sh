#!/usr/bin/env bash
set -euo pipefail
ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
ENCRYPTED_FILE="$ROOT_DIR/secrets/network-os.local.env.gpg"
OUTPUT_FILE="$ROOT_DIR/.env.local"

if ! command -v gpg >/dev/null 2>&1; then
  echo "gpg is required to decrypt local secrets." >&2
  exit 1
fi

if [[ ! -f "$ENCRYPTED_FILE" ]]; then
  echo "Missing encrypted secrets bundle: $ENCRYPTED_FILE" >&2
  exit 1
fi

read -rsp "Enter secrets password: " SECRET_PASSWORD
echo

gpg --batch --yes --quiet --passphrase "$SECRET_PASSWORD" --pinentry-mode loopback --decrypt "$ENCRYPTED_FILE" > "$OUTPUT_FILE"
chmod 600 "$OUTPUT_FILE"
echo ".env.local created. Secret values were not printed."
