# Environment Variables

This repo uses the locked Secrets Simplicity Rule.

## Local/operator setup

Encrypted file committed to repo:

```text
secrets/network-os.local.env.gpg
```

Password/passphrase:

Use the approved West Peek vault passphrase. Do not store or commit the passphrase value in this repo.

The passphrase is not embedded in scripts.

Decrypt:

```bash
./scripts/secrets/decrypt-local-env.sh
```

Check key presence:

```bash
./scripts/secrets/check-secrets.sh
```

Push to Cloudflare:

```bash
./scripts/secrets/push-cloudflare-secrets.sh
```

## Required keys

See `.env.example` for safe placeholder names. Plaintext `.env` and `.env.local` are not committed.

## Production

Production secrets live in Cloudflare secret/environment settings. The script `scripts/secrets/push-cloudflare-secrets.sh` reads `.env.local`, pushes approved keys with Wrangler, and does not print secret values.

- `ANTHROPIC_MODEL` — optional Claude model override for the Relationship Assistant. Default: `claude-3-5-haiku-latest`.

## Phase 7 Pitch Lab Handoff

These are required only when accepting signed West Peek Pitch Lab submissions.

- `PITCH_LAB_SHARED_SECRET` — server-side shared HMAC secret. Must match Pitch Lab `NETWORK_OS_SHARED_SECRET`. Never expose to browser.
- `PITCH_LAB_ALLOWED_ORIGIN` — optional documentation/ops allowlist value for the Pitch Lab origin. Signature is the security boundary; origin alone is not sufficient.

Pitch Lab submissions must create `pending_human_review` intake rows only. They must not create contacts automatically.


## Phase 9D Pitch Lab Shared Secret Sync

`PITCH_LAB_SHARED_SECRET` is now included in the encrypted local secret bundle and in `scripts/secrets/required-keys.txt`. It must match Pitch Lab `NETWORK_OS_SHARED_SECRET`. The value is intentionally not printed in docs or examples.
