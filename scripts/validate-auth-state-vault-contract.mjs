import fs from 'node:fs';
const failures = [];
const required = [
  'scripts/auth-state/common.sh',
  'scripts/auth-state/backup.sh',
  'scripts/auth-state/restore.sh',
  'scripts/auth-state/status.sh',
  'scripts/auth-state/remove-local.sh',
  'scripts/auth-state/run-tier4.sh',
  'scripts/auth-state/run-hallmark.sh',
  'AUTH_STATE_VAULT.md'
];
for (const file of required) if (!fs.existsSync(file)) failures.push(`missing ${file}`);
const gitignore = fs.readFileSync('.gitignore','utf8');
if (!/^\.auth\/$/m.test(gitignore)) failures.push('.auth/ must remain gitignored');
const common = fs.readFileSync('scripts/auth-state/common.sh','utf8');
for (const phrase of ['AI_AUTH_VAULTS/west-peek-network-os','wpn_session','west-peek-network-os.pages.dev']) if (!common.includes(phrase)) failures.push(`auth-state contract missing ${phrase}`);
const hallmark = fs.readFileSync('scripts/auth-state/run-hallmark.sh','utf8');
if (!hallmark.includes('--storage-state')) failures.push('Hallmark wrapper must pass --storage-state');
if (!hallmark.includes('does not support --storage-state')) failures.push('Hallmark wrapper must capability-check --storage-state support');
const tier4 = fs.readFileSync('scripts/auth-state/run-tier4.sh','utf8');
for (const key of ['TIER4_AUTHENTICATED_STORAGE_STATE','PLAYWRIGHT_STORAGE_STATE']) if (!tier4.includes(key)) failures.push(`Tier 4 wrapper missing ${key}`);
if (!tier4.includes('Operator Gmail seeds are still required')) failures.push('Tier 4 wrapper must disclose Gmail seed requirement');
for (const file of ['scripts/auth-state/backup.sh','scripts/auth-state/restore.sh']) { const body=fs.readFileSync(file,'utf8'); if (body.includes('--passphrase "$AUTH_STATE_VAULT_PASSPHRASE"')) failures.push(`${file} exposes passphrase in argv`); if (!body.includes('--passphrase-fd 3')) failures.push(`${file} must use passphrase fd`); }
if (failures.length) { console.error('validate:auth-state-vault: FAIL'); failures.forEach(x=>console.error(`- ${x}`)); process.exit(1); }
console.log('validate:auth-state-vault: PASS');
