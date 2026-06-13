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
      if (['.git', 'node_modules', 'dist', '.wrangler', 'playwright-report', 'test-results', 'coverage'].includes(entry.name)) continue;
      files.push(...walkFiles(full));
    } else {
      files.push(full);
    }
  }
  return files;
}

function shouldSkipFallbackFile(file) {
  return file.startsWith('node_modules/') || file.startsWith('dist/') || file.startsWith('playwright-report/') || file.startsWith('test-results/') || file === 'tsconfig.tsbuildinfo' || file.endsWith('.zip') || file.endsWith('.gpg');
}

const trackedFiles = gitFiles();
const forbiddenTrackedFiles = ['.env', '.env.local', '.env.production', '.env.backup', '.env.local.backup', 'cloudflare-secrets.json'];
for (const file of forbiddenTrackedFiles) {
  if (trackedFiles.includes(file)) {
    console.error(`Forbidden plaintext secret file is present/tracked: ${file}`);
    process.exit(1);
  }
}

const allowedPlaceholderFiles = new Set(['.env.example', '.env.local.example']);
const allowedEncryptedFiles = new Set(['secrets/network-os.local.env.gpg', 'secrets/west-peek-network-os.env.local.gpg']);
const allowedLiteralFiles = new Set(['scripts/check-no-plaintext-secrets.mjs', 'SECRET_EXCEPTION_LEDGER.md', 'scripts/secrets/decrypt-local-env.sh', 'scripts/secrets/encrypt-local-env.sh']);

const suspiciousPatterns = [
  { name: 'Anthropic API key', pattern: /sk-ant-[A-Za-z0-9_-]{20,}/ },
  { name: 'Google API key', pattern: /AIza[0-9A-Za-z_-]{20,}/ },
  { name: 'Private key block', pattern: /-----BEGIN (?:RSA |EC |OPENSSH |)PRIVATE KEY-----/ },
  { name: 'Resend API key', pattern: /^RESEND_API_KEY=(?!replace-with|$).+/m },
  { name: 'committed shared password phrase', pattern: /3021WPeek/i },
  { name: 'password literal', pattern: /\b(password|passphrase|shared password|team password)[ \t]*[:=](?![ \t]*[`"']?(?:stored only in owner password manager|stored in owner password manager|owner password manager|replace-with|REDACTED|redacted|\$\{|<|$))[ \t]*[`"']?[^`"'\n]{6,}/i },
  { name: 'token secret literal', pattern: /\b(secret|api[_ -]?key|client[_ -]?secret)[ \t]*[:=](?![ \t]*[`"']?(?:replace-with|REDACTED|redacted|stored in|env\.|process\.env|\$\{|<|$))[ \t]*[`"']?[A-Za-z0-9_\-/.+=]{16,}/i }
];

for (const file of trackedFiles) {
  if (allowedPlaceholderFiles.has(file) || allowedEncryptedFiles.has(file) || allowedLiteralFiles.has(file)) continue;
  if (!/\.(ts|tsx|js|mjs|md|json|toml|example|sh|yml|yaml)$/.test(file)) continue;
  if (!fs.existsSync(file)) continue;

  const text = fs.readFileSync(file, 'utf8');
  for (const { name, pattern } of suspiciousPatterns) {
    if (pattern.test(text)) {
      console.error(`Potential plaintext secret found in tracked/source file: ${file} (${name})`);
      process.exit(1);
    }
  }
}

console.log('SECRET CHECK OK — no plaintext env files, shared password literals, passphrases, or obvious key patterns found.');
