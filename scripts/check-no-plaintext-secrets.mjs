import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const forbiddenFiles = ['.env', '.env.local'];
for (const file of forbiddenFiles) {
  if (fs.existsSync(path.join(root, file))) {
    console.error(`Forbidden plaintext secret file exists: ${file}`);
    process.exit(1);
  }
}
const allowedPlaceholderFiles = new Set(['.env.example', '.env.local.example']);
const suspiciousPatterns = [
  /sk-ant-[A-Za-z0-9_-]{20,}/,
  /AIza[0-9A-Za-z_-]{20,}/,
  /-----BEGIN PRIVATE KEY-----/,
  /RESEND_API_KEY=.+(?!replace)/
];
function walk(dir) {
  for (const item of fs.readdirSync(dir)) {
    const full = path.join(dir, item);
    const rel = path.relative(root, full);
    if (['node_modules', '.git', 'dist', 'coverage', 'playwright-report', 'test-results'].some((part) => rel.split(path.sep).includes(part))) continue;
    const stat = fs.statSync(full);
    if (stat.isDirectory()) walk(full);
    else if (/\.(ts|tsx|js|mjs|md|json|toml|example|sh)$/.test(item) && !allowedPlaceholderFiles.has(rel) && rel !== 'scripts/check-no-plaintext-secrets.mjs') {
      const text = fs.readFileSync(full, 'utf8');
      for (const pattern of suspiciousPatterns) {
        if (pattern.test(text)) {
          console.error(`Potential plaintext secret found in ${rel}`);
          process.exit(1);
        }
      }
    }
  }
}
walk(root);
console.log('SECRET CHECK OK — no plaintext .env/.env.local or obvious key patterns found.');
