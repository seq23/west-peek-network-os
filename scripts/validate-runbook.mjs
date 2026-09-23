#!/usr/bin/env node
// RUNBOOK.md is read by AI employees (Porter, Danielle) at plan time; the web-property change lane
// in West Peek OS blocks unless it exists. A runbook naming a path or script that no longer exists
// sends the reader to the wrong place, so this fails the build the moment they drift. It hard-fails
// on a missing runbook and on a runbook that names nothing.
import fs from 'node:fs';

const errors = [];
if (!fs.existsSync('RUNBOOK.md')) {
  console.error('validate:runbook FAILED\n  - RUNBOOK.md is missing at the repo root');
  process.exit(1);
}
const md = fs.readFileSync('RUNBOOK.md', 'utf8');
const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));

// Backticked repo paths under a top-level directory, plus backticked root files by extension.
const dirPath = /`((?:src|functions|scripts|tests|docs|config|public|secrets|\.github)\/[^`#\s]+?)`/g;
const rootFile = /`([A-Za-z0-9_.-]+\.(?:md|json|toml|ts|mjs|html))`/g;
const paths = [...new Set([...md.matchAll(dirPath), ...md.matchAll(rootFile)].map((m) => m[1]))].filter((p) => !p.includes('<'));
const scripts = [...new Set([...md.matchAll(/`(?:[A-Z_]+=\S+ )*npm run ([a-z0-9:-]+)/g)].map((m) => m[1]))];

if (!paths.length) errors.push('RUNBOOK.md names no repo paths');
if (!scripts.length) errors.push('RUNBOOK.md names no npm scripts');
for (const p of paths) if (!fs.existsSync(p)) errors.push(`RUNBOOK.md names ${p}, which does not exist`);
for (const s of scripts) if (!pkg.scripts?.[s]) errors.push(`RUNBOOK.md names npm run ${s}, which package.json does not define`);

// The runbook must name the command CI actually gates on, or the reader validates the wrong thing.
const workflow = fs.readFileSync('.github/workflows/validate.yml', 'utf8');
const ciCommands = [...workflow.matchAll(/run:\s*(npm run [^\n]+)/g)].map((m) => m[1].trim());
if (!ciCommands.length) errors.push('.github/workflows/validate.yml runs no npm script; the runbook guard cannot tell what CI gates on');
for (const c of ciCommands) if (!md.includes(c)) errors.push(`RUNBOOK.md does not name the CI gate command \`${c}\``);

console.log(`runbook: ${paths.length} path(s), ${scripts.length} script(s), ${ciCommands.length} CI gate command(s) verified`);
if (errors.length) {
  console.error('validate:runbook FAILED');
  for (const e of errors) console.error(`  - ${e}`);
  process.exit(1);
}
console.log('validate:runbook PASS');
