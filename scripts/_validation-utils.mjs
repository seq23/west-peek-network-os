import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';

export const root = process.cwd();
export function read(file, failures = null) {
  const full = path.join(root, file);
  if (!fs.existsSync(full)) {
    if (failures) failures.push(`Missing ${file}`);
    return '';
  }
  return fs.readFileSync(full, 'utf8');
}
export function readJson(file, fallback = null) {
  const text = read(file);
  if (!text) return fallback;
  try { return JSON.parse(text); } catch (error) { throw new Error(`${file} is not valid JSON: ${error.message}`); }
}
export function failOrPass(name, failures) {
  if (failures.length) {
    console.error(`${name}: FAIL`);
    for (const failure of failures) console.error(`- ${failure}`);
    process.exit(1);
  }
  console.log(`${name}: PASS`);
}
export function listFiles(dir = root) {
  const out = [];
  const walk = (base) => {
    for (const entry of fs.readdirSync(base, { withFileTypes: true })) {
      const full = path.join(base, entry.name);
      const rel = path.relative(root, full).replace(/\\/g, '/');
      if (rel === 'node_modules' || rel.startsWith('node_modules/')) continue;
      if (entry.isDirectory()) walk(full); else out.push(rel);
    }
  };
  walk(dir);
  return out;
}
export function removeGeneratedArtifacts() {
  const targets = ['reports', 'test-results', 'playwright-report', 'dist', 'build', 'coverage', '.vite', '.cache', '.tmp', 'tsconfig.tsbuildinfo'];
  for (const target of targets) fs.rmSync(path.join(root, target), { recursive: true, force: true });
}
export function run(command, options = {}) {
  return new Promise((resolve) => {
    const child = spawn(command, { cwd: root, shell: true, stdio: 'inherit', env: { ...process.env, NODE_OPTIONS: process.env.NODE_OPTIONS || '--max-old-space-size=3072', ...(options.env || {}) } });
    child.on('close', (code) => resolve(code ?? 1));
  });
}
export async function runRequired(command) {
  console.log(`\n==> ${command}`);
  const code = await run(command);
  if (code !== 0) process.exit(code);
}
