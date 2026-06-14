import fs from 'node:fs/promises';
const m = JSON.parse(await fs.readFile('config/deployed-route-manifest.json', 'utf8'));
const rows = m.routes.map((r) => `| ${r.id} | UNPROVEN | UNPROVEN | ${r.persistenceRequired ? 'UNPROVEN' : 'NOT APPLICABLE'} | UNPROVEN | UNPROVEN | ${r.cleanupPolicy === 'none' ? 'NOT APPLICABLE' : 'UNPROVEN'} | UNPROVEN |`).join('\n');
await fs.writeFile('FINAL_PROOF_COVERAGE_MATRIX.md', `# Final Proof Coverage Matrix\n\n| Route | Hallmark | Deployed Visual | Persistence | Refresh/Re-entry | Mobile | Cleanup | Final |\n|---|---|---|---|---|---|---|---|\n${rows}\n`);
console.log('final proof matrix generated');
