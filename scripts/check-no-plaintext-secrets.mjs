import fs from 'node:fs';
import { execSync } from 'node:child_process';

const trackedFiles = execSync('git ls-files', { encoding: 'utf8' })
  .split('\n')
  .map((file) => file.trim())
  .filter(Boolean);

const forbiddenTrackedFiles = ['.env', '.env.local'];
for (const file of forbiddenTrackedFiles) {
  if (trackedFiles.includes(file)) {
    console.error(`Forbidden plaintext secret file is tracked by Git: ${file}`);
    process.exit(1);
  }
}

const allowedPlaceholderFiles = new Set(['.env.example', '.env.local.example']);
const allowedEncryptedFiles = new Set(['secrets/network-os.local.env.gpg']);

const suspiciousPatterns = [
  /sk-ant-[A-Za-z0-9_-]{20,}/,
  /AIza[0-9A-Za-z_-]{20,}/,
  /-----BEGIN PRIVATE KEY-----/,
  /^RESEND_API_KEY=(?!replace-with|$).+/m
];

for (const file of trackedFiles) {
  if (allowedPlaceholderFiles.has(file) || allowedEncryptedFiles.has(file)) continue;
  if (file === 'scripts/check-no-plaintext-secrets.mjs') continue;
  if (!/\.(ts|tsx|js|mjs|md|json|toml|example|sh)$/.test(file)) continue;
  if (!fs.existsSync(file)) continue;

  const text = fs.readFileSync(file, 'utf8');
  for (const pattern of suspiciousPatterns) {
    if (pattern.test(text)) {
      console.error(`Potential plaintext secret found in tracked file: ${file}`);
      process.exit(1);
    }
  }
}

console.log('SECRET CHECK OK — no tracked plaintext .env/.env.local or obvious key patterns found.');
