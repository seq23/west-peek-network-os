# Cloudflare Deployment Runbook — West Peek Network OS

Status: ACTIVE  
Date: 2026-06-11

Deployment target: Cloudflare Pages.

## Automatic push deploy path

This repo now includes `.github/workflows/deploy-cloudflare-pages.yml`.

On push to `main`, GitHub Actions will:

1. install dependencies with `npm ci`
2. run `npm run validate:everything -- --tier=1`
3. build with `NODE_OPTIONS=--max-old-space-size=3072 npm run build`
4. deploy `dist` to Cloudflare Pages using Wrangler

Required GitHub Secrets:

- `CLOUDFLARE_API_TOKEN`
- `CLOUDFLARE_ACCOUNT_ID`

Required GitHub variable or env:

- `CLOUDFLARE_PROJECT_NAME=west-peek-network-os`

## Cloudflare Git integration note

If Cloudflare Pages dashboard Git integration is also connected, pushes to `main` may deploy through Cloudflare directly. That connection must be proven from Cloudflare/GitHub evidence; repo files alone cannot prove it.

## Postdeploy

After deploy:

```bash
POSTDEPLOY_BASE_URL="https://network.joinwestpeek.com" npm run postdeploy:smoke
```

If live Gmail trigger ingestion is not run, report:

`LIVE GMAIL TRIGGER INGESTION — UNPROVEN`.
