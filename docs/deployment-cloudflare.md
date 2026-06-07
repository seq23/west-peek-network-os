# Cloudflare Deployment

Target URL: `https://network.joinwestpeek.com`

Recommended operator sequence:

```bash
./scripts/secrets/decrypt-local-env.sh
./scripts/secrets/check-secrets.sh
./scripts/secrets/push-cloudflare-secrets.sh
NODE_OPTIONS="--max-old-space-size=3072" npm run build 2>&1 | tee logs/build.log
```

One-time manual steps:

1. `npx wrangler login`
2. Connect GitHub repo to Cloudflare Pages if not already connected.
3. Set project name to `west-peek-network-os`.
4. Set custom domain `network.joinwestpeek.com`.
5. Configure Google OAuth redirect URL.
