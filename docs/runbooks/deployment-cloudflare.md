# Cloudflare Deployment Runbook — West Peek Network OS

Status: ACTIVE  
Date: 2026-06-11

Deployment target: Cloudflare Pages.

## Automatic push deploy path

Cloudflare Pages is connected directly to this GitHub repository. The Cloudflare
Git integration is the single deployment authority for pushes to `main`.

On push to `main`:

1. GitHub Actions runs `.github/workflows/validate.yml`.
2. Cloudflare's native Git integration builds and deploys the same commit.
3. The deployed application is verified with the strict postdeploy checks.

The repository does not run a second Wrangler-based Pages deployment workflow.
Consequently, these duplicate deployment secrets are not required in GitHub:

- `CLOUDFLARE_API_TOKEN`
- `CLOUDFLARE_ACCOUNT_ID`

The connected Cloudflare project remains `west-peek-network-os`. Deployment
status is verified in Cloudflare; GitHub validation proves the repository checks
but is not a second deployment mechanism.

## Postdeploy

After deploy:

```bash
POSTDEPLOY_BASE_URL="https://network.joinwestpeek.com" npm run postdeploy:smoke
```

If live Gmail trigger ingestion is not run, report:

`LIVE GMAIL TRIGGER INGESTION — UNPROVEN`.
