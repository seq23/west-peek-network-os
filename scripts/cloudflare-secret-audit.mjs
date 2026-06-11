#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
const root = process.cwd();
const reportsDir = path.join(root, 'reports');
fs.mkdirSync(reportsDir, { recursive: true });
const contract = JSON.parse(fs.readFileSync(path.join(root, '_env_contract.json'), 'utf8'));
const keys = contract.cloudflareSecretEnv || contract.requiredRuntimeEnv || [];
const report = {
  repo: contract.repo,
  generatedAt: new Date().toISOString(),
  target: contract.cloudflareTarget,
  projectName: contract.cloudflareProjectName || null,
  workerName: contract.cloudflareWorkerName || null,
  expectedCloudflareSecrets: keys,
  status: 'UNPROVEN',
  note: 'This local audit proves the expected Cloudflare secret name contract only. Live Cloudflare presence requires running cloudflare-secret-sync with --execute or platform/API inspection.'
};
fs.writeFileSync(path.join(reportsDir, 'cloudflare-secret-audit.json'), JSON.stringify(report, null, 2) + '\n');
let md = `# Cloudflare Secret Audit — ${contract.repo}\n\nGenerated: ${report.generatedAt}\nStatus: ${report.status}\nTarget: ${report.target}\n\n`;
md += 'Expected Cloudflare secret/var names:\n';
for (const key of keys) md += `- ${key}\n`;
md += `\n${report.note}\n`;
fs.writeFileSync(path.join(reportsDir, 'cloudflare-secret-audit.md'), md);
console.log(md);
