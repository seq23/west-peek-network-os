#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const root = process.cwd();
const args = new Set(process.argv.slice(2));
const dryRun = args.has('--dry-run') || !args.has('--execute');
const contract = JSON.parse(fs.readFileSync(path.join(root, '_env_contract.json'), 'utf8'));
const envPath = path.join(root, '.env.local');
if (!fs.existsSync(envPath)) throw new Error('.env.local is required. Run npm run env:restore first.');
const raw = fs.readFileSync(envPath, 'utf8');
const env = {};
for (const line of raw.split(/\r?\n/)) {
  if (!line || /^\s*#/.test(line)) continue;
  const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
  if (m) env[m[1]] = m[2].replace(/^"|"$/g, '');
}
const keys = contract.cloudflareSecretEnv || contract.requiredRuntimeEnv || [];
const missing = keys.filter((key) => !env[key]);
if (missing.length) throw new Error(`Missing .env.local values for Cloudflare sync: ${missing.join(', ')}`);
console.log(`cloudflare-secret-sync: ${dryRun ? 'DRY RUN' : 'EXECUTE'} for ${contract.repo}. Values will not be printed.`);
for (const key of keys) {
  if (dryRun) {
    console.log(`would set Cloudflare secret/var: ${key}`);
    continue;
  }
  let cmd;
  let cmdArgs;
  if (contract.cloudflareTarget === 'pages') {
    const projectName = process.env.CLOUDFLARE_PROJECT_NAME || env.CLOUDFLARE_PROJECT_NAME || contract.cloudflareProjectName;
    if (!projectName) throw new Error('CLOUDFLARE_PROJECT_NAME/cloudflareProjectName required for Pages secret sync.');
    cmd = 'npx'; cmdArgs = ['wrangler', 'pages', 'secret', 'put', key, '--project-name', projectName];
  } else {
    cmd = 'npx'; cmdArgs = ['wrangler', 'secret', 'put', key];
  }
  const proc = spawnSync(cmd, cmdArgs, { input: env[key], encoding: 'utf8', stdio: ['pipe', 'inherit', 'pipe'] });
  if (proc.status !== 0) throw new Error(`Cloudflare secret put failed for ${key}: ${proc.stderr || ''}`);
  console.log(`set Cloudflare secret/var: ${key}`);
}
