#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
const root = process.cwd();
const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
const required = ['docs/ACTIVE_DOCS.md','docs/DOCS_CONSOLIDATION_MAP.md','docs/archive/ARCHIVE_INDEX.md'];
const failures = [];
for (const rel of required) if (!fs.existsSync(path.join(root, rel))) failures.push(`Missing ${rel}`);
const mapPath = path.join(root, 'docs/DOCS_CONSOLIDATION_MAP.md');
const archivePath = path.join(root, 'docs/archive/ARCHIVE_INDEX.md');
const mapText = fs.existsSync(mapPath) ? fs.readFileSync(mapPath, 'utf8') : '';
const archiveText = fs.existsSync(archivePath) ? fs.readFileSync(archivePath, 'utf8') : '';
function walk(dir) {
  const out = [];
  if (!fs.existsSync(dir)) return out;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...walk(full));
    else if (entry.isFile() && entry.name.endsWith('.md')) out.push(full);
  }
  return out;
}
const ignoredPrefixes = ['reports/', 'logs/', 'secrets/', 'node_modules/', 'dist/', 'build/', 'coverage/', 'playwright-report/', 'test-results/', '.cache/', '.tmp/'];
const docs = walk(root)
  .map((full) => path.relative(root, full).replaceAll(path.sep,'/'))
  .filter((rel) => !ignoredPrefixes.some((prefix) => rel.startsWith(prefix)));
for (const rel of docs) {
  if (rel === 'docs/DOCS_CONSOLIDATION_MAP.md' || rel === 'docs/archive/ARCHIVE_INDEX.md' || rel === 'docs/ACTIVE_DOCS.md') continue;
  if (rel.startsWith('docs/archive/')) {
    if (!archiveText.includes(rel)) failures.push(`Archived doc missing from archive index: ${rel}`);
  } else if (!mapText.includes(rel)) failures.push(`Active/non-archived doc missing from consolidation map: ${rel}`);
}
if (!mapText.includes('ARCHIVED') && docs.some((rel) => rel.startsWith('docs/archive/'))) failures.push('Consolidation map does not include ARCHIVED rows.');
fs.mkdirSync(path.join(root,'reports'), { recursive: true });
const report = { repo: pkg.name, generatedAt: new Date().toISOString(), markdownDocs: docs.length, failures };
fs.writeFileSync(path.join(root,'reports','docs-consolidation.json'), JSON.stringify(report,null,2)+'\n');
const md = [`# Docs Consolidation Report — ${pkg.name}`,'',`Generated: ${report.generatedAt}`,`Markdown docs tracked: ${docs.length}`,`Result: ${failures.length ? 'FAIL' : 'PASS'}`,''];
if (failures.length) { md.push('## Failures'); for (const f of failures) md.push(`- ${f}`); }
else md.push('All active and archived Markdown docs are mapped.');
fs.writeFileSync(path.join(root,'reports','docs-consolidation.md'), md.join('\n')+'\n');
if (failures.length) {
  console.warn(`Docs consolidation STRONG WARNING — ${docs.length} docs scanned.`);
  for (const failure of failures) console.warn(`- ${failure}`);
} else {
  console.log(`Docs consolidation PASS — ${docs.length} docs tracked.`);
}
