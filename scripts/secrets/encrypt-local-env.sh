#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
ENV_FILE="$ROOT_DIR/.env.local"
ENCRYPTED_FILE="$ROOT_DIR/secrets/network-os.local.env.gpg"

if ! command -v gpg >/dev/null 2>&1; then
  echo "gpg is required to encrypt local secrets." >&2
  exit 1
fi

if [[ ! -f "$ENV_FILE" ]]; then
  echo "Missing .env.local. Nothing to encrypt." >&2
  exit 1
fi

"$ROOT_DIR/scripts/secrets/check-secrets.sh"

read -rsp "Enter secrets password: " SECRET_PASSWORD
echo

gpg --batch --yes --quiet --symmetric --cipher-algo AES256 --passphrase "$SECRET_PASSWORD" --pinentry-mode loopback --output "$ENCRYPTED_FILE" "$ENV_FILE"
chmod 600 "$ENCRYPTED_FILE"

echo "Encrypted secrets bundle updated. Secret values were not printed."
