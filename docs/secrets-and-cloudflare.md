# Secrets and Cloudflare Setup

## Locked Item #32 — Secrets Simplicity Rule

Goal: avoid scattered environment-variable drama while keeping real secrets out of plaintext repo files.

Local/operator setup uses one encrypted secrets bundle committed to the repo:

```text
secrets/network-os.local.env.gpg
```

Password/passphrase:

```text
3021WPeek
```

The repo includes:

- `scripts/secrets/decrypt-local-env.sh`
- `scripts/secrets/check-secrets.sh`
- `scripts/secrets/push-cloudflare-secrets.sh`
- `.env.example`
- `.env.local.example`
- `ENVIRONMENT_VARIABLES.md`

The repo must not include:

- `.env`
- `.env.local`
- plaintext API keys
- plaintext OAuth secrets
- plaintext Google private keys
- plaintext Anthropic key
- plaintext vendor keys
- password embedded inside scripts

## Cloudflare Secret Push Rule

The repo includes a script that can push production secrets to Cloudflare from decrypted `.env.local`.

```bash
./scripts/secrets/decrypt-local-env.sh
./scripts/secrets/check-secrets.sh
./scripts/secrets/push-cloudflare-secrets.sh
```

The push script reads approved keys from `.env.local`, pushes them with Wrangler, prints only key names/status, and does not print values.

One-time manual setup still includes:

1. Wrangler login.
2. Cloudflare Pages project/repo connection if missing.
3. Custom domain `network.joinwestpeek.com`.
4. Google OAuth redirect URL setup.
