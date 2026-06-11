import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';

function gitFiles() {
  try {
    return execSync('git ls-files', { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] })
      .split('\n')
      .map((file) => file.trim())
      .filter(Boolean);
  } catch {
    return walkFiles(process.cwd())
      .map((file) => path.relative(process.cwd(), file).replaceAll(path.sep, '/'))
      .filter((file) => !shouldSkipFallbackFile(file));
  }
}

function walkFiles(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (['.git', 'node_modules', 'dist', '.wrangler'].includes(entry.name)) continue;
      files.push(...walkFiles(full));
    } else {
      files.push(full);
    }
  }
  return files;
}

function shouldSkipFallbackFile(file) {
  return file.startsWith('node_modules/') || file.startsWith('dist/') || file === 'tsconfig.tsbuildinfo' || file.endsWith('.zip');
}

const trackedFiles = gitFiles();

const forbiddenTrackedFiles = ['.env', '.env.local'];
for (const file of forbiddenTrackedFiles) {
  if (trackedFiles.includes(file)) {
    console.error(`Forbidden plaintext secret file is present/tracked: ${file}`);
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
      console.error(`Potential plaintext secret found in tracked/source file: ${file}`);
      process.exit(1);
    }
  }
}

console.log('SECRET CHECK OK — no plaintext .env/.env.local or obvious key patterns found.');
