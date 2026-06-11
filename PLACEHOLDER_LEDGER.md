# Placeholder Ledger — West Peek Network OS

Status: ACTIVE  
Date: 2026-06-11

Allowed placeholders are safe examples only. Real secrets must never be committed.

| Placeholder surface | Allowed? | Reason | Replacement location |
|---|---:|---|---|
| `.env.example` / `.env.local.example` values beginning with `replace-with-` | YES | Safe env scaffolding | Cloudflare secrets, encrypted local vault, owner password manager |
| `secrets/*.env.local.gpg` | YES | Encrypted canonical vault; no plaintext secret values in repo | Decrypted locally only by `npm run env:restore` |
| `.env.local` | NO | Plaintext secret file | Local only, removed by `npm run env:remove`, ignored by git |
| Cloudflare/GitHub tokens | NO | Platform credentials | GitHub Actions secrets / Cloudflare secret store |
| Fake provider success in production runtime | NO | Would be validator theater | Tests only, explicit mock lanes only |
