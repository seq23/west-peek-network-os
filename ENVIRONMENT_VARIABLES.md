# Environment Variables

This repo uses the locked Secrets Simplicity Rule.

## Local/operator setup

Encrypted file committed to repo:

```text
secrets/network-os.local.env.gpg
```

Password/passphrase:

```text
3021WPeek
```

The password is not embedded in scripts.

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
