# Environment Setup Runbook — West Peek Network OS

Status: ACTIVE  
Date: 2026-06-11

## Canonical files

- Env contract: `_env_contract.json`
- Safe examples: `.env.example`, `.env.local.example`
- Canonical encrypted local vault: `secrets/west-peek-network-os.env.local.gpg`
- Legacy encrypted vault retained for continuity: `secrets/network-os.local.env.gpg`

## Local restore

```bash
npm run env:restore
```

If `.env.local` already exists, the script refuses to overwrite unless `-- --overwrite` is passed. Any backup is written outside the repo under `/tmp`.

## Local remove

```bash
npm run env:remove
```

## Parity trace

```bash
npm run env:trace
```

Reports:

- `reports/env-parity-trace.md`
- `reports/env-parity-trace.json`

## Cloudflare secret setup

Dry-run first:

```bash
npm run cloudflare:secrets:sync -- --dry-run
```

Execute only from a trusted local machine after restoring `.env.local`:

```bash
npm run cloudflare:secrets:sync -- --execute
```

Secret values are piped to Wrangler and are not printed. Cloudflare secret presence is not proven until the command is executed or the dashboard/API is inspected.
