# Secret and Env Policy

Real secrets do not belong in repo artifacts. `.env.example` and `.env.local.example` are safe scaffolds only. Cloudflare/local env parity is proven by behavior, not by printing secret values.
