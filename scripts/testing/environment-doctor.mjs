import fs from 'node:fs';
import net from 'node:net';
import { chromium } from '@playwright/test';

const base = process.env.PLAYWRIGHT_BASE_URL || 'http://127.0.0.1:3000';
const u = new URL(base);
const port = Number(u.port || (u.protocol === 'https:' ? 443 : 80));
const checks = [];
const add = (name, ok, detail = '', category = 'configuration') => checks.push({ name, ok, detail, category });
const executable = chromium.executablePath();
add('playwright chromium executable', fs.existsSync(executable), executable, 'browser');
add('base URL uses 127.0.0.1', u.hostname === '127.0.0.1', base, 'configuration');
add('test environment template exists', fs.existsSync('.env.test') || fs.existsSync('.env.test.example'), '.env.test or .env.test.example', 'configuration');
await new Promise((resolve) => {
  const s = net.createServer();
  s.once('error', (e) => { add('target port available', false, e.code || e.message, 'configuration'); resolve(); });
  s.once('listening', () => s.close(() => { add('target port available', true, String(port), 'configuration'); resolve(); }));
  s.listen(port, '127.0.0.1');
});
if (fs.existsSync(executable)) {
  try {
    const browser = await chromium.launch({ headless: true, args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'] });
    await browser.close();
    add('chromium launches in current runtime', true, '', 'browser');
  } catch (error) {
    add('chromium launches in current runtime', false, error instanceof Error ? error.message : String(error), 'browser');
  }
} else {
  add('chromium launches in current runtime', false, 'browser executable is not installed', 'browser');
}
for (const c of checks) console.log(`${c.ok ? 'PASS' : 'FAIL'} [${c.category}] ${c.name}${c.detail ? `: ${c.detail}` : ''}`);
const failed = checks.filter((c) => !c.ok);
if (!failed.length) {
  console.log('ENVIRONMENT_DOCTOR_CLASSIFICATION=PASS');
  process.exit(0);
}
if (failed.every((c) => c.category === 'browser')) {
  console.error('ENVIRONMENT_DOCTOR_CLASSIFICATION=BROWSER_UNAVAILABLE');
  process.exit(20);
}
console.error('ENVIRONMENT_DOCTOR_CLASSIFICATION=CONFIGURATION_FAILURE');
process.exit(1);
