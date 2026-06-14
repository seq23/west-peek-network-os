#!/usr/bin/env node
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const root = process.cwd();
const args = new Set(process.argv.slice(2));
const contract = JSON.parse(fs.readFileSync(path.join(root, '_env_contract.json'), 'utf8'));
const configuredVaults = [
  contract.encryptedVault,
  contract.legacyEncryptedVault
].filter(Boolean);

const selectedVault = configuredVaults.find((candidate) =>
  fs.existsSync(path.join(root, candidate))
);

const target = path.join(root, '.env.local');

if (!configuredVaults.length) {
  throw new Error(
    'No encryptedVault or legacyEncryptedVault configured in _env_contract.json.'
  );
}

if (!selectedVault) {
  throw new Error(
    `Encrypted vault not found. Checked: ${configuredVaults.join(', ')}`
  );
}

const vault = path.join(root, selectedVault);
if (fs.existsSync(target) && !args.has('--overwrite')) {
  const backupDir = path.join(os.tmpdir(), `${contract.repo || 'repo'}-env-backups`);
  fs.mkdirSync(backupDir, { recursive: true });
  const backupPath = path.join(backupDir, `.env.local.${Date.now()}.bak`);
  fs.copyFileSync(target, backupPath);
  throw new Error(`.env.local already exists. Safe backup copied outside repo to ${backupPath}. Re-run with --overwrite if intentional.`);
}
const proc = spawnSync('gpg', ['--quiet', '--decrypt', vault], { encoding: 'utf8' });
if (proc.status !== 0) {
  throw new Error(`gpg decrypt failed. ${proc.stderr || ''}`.trim());
}
fs.writeFileSync(target, proc.stdout, { mode: 0o600 });
console.log(`env-restore: restored .env.local from ${selectedVault}. Secret values were not printed.`);
