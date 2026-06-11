#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const reportsDir = path.join(root, 'reports');
fs.mkdirSync(reportsDir, { recursive: true });
const contract = JSON.parse(fs.readFileSync(path.join(root, '_env_contract.json'), 'utf8'));
function parseEnvFile(file) {
  const p = path.join(root, file);
  if (!fs.existsSync(p)) return {};
  const out = {};
  for (const line of fs.readFileSync(p, 'utf8').split(/\r?\n/)) {
    if (!line || /^\s*#/.test(line)) continue;
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (m) out[m[1]] = m[2] ? '<present>' : '<empty>';
  }
  return out;
}
const local = parseEnvFile('.env.local');
const example = parseEnvFile('.env.example');
const localExample = parseEnvFile('.env.local.example');
const keys = [...new Set([...(contract.requiredRuntimeEnv || []), ...(contract.optionalRuntimeEnv || []), ...(contract.localOnlyEnv || [])])].sort();
const rows = keys.map((key) => ({
  key,
  required: (contract.requiredRuntimeEnv || []).includes(key),
  optional: (contract.optionalRuntimeEnv || []).includes(key),
  localOnly: (contract.localOnlyEnv || []).includes(key),
  example: example[key] ? 'present' : 'missing',
  localExample: localExample[key] ? 'present' : 'missing',
  local: local[key] ? 'present' : 'missing',
  runtime: process.env[key] ? 'present' : 'missing'
}));
const report = { repo: contract.repo, generatedAt: new Date().toISOString(), vault: contract.encryptedVault, rows };
fs.writeFileSync(path.join(reportsDir, 'env-parity-trace.json'), JSON.stringify(report, null, 2) + '\n');
let md = `# Env Parity Trace — ${contract.repo}\n\nGenerated: ${report.generatedAt}\nVault: ${contract.encryptedVault || 'not configured'}\n\n`;
md += '| Key | Required | Example | Local example | Local | Runtime |\n|---|---:|---:|---:|---:|---:|\n';
for (const r of rows) md += `| ${r.key} | ${r.required ? 'YES' : 'NO'} | ${r.example} | ${r.localExample} | ${r.local} | ${r.runtime} |\n`;
fs.writeFileSync(path.join(reportsDir, 'env-parity-trace.md'), md);
console.log(md);
