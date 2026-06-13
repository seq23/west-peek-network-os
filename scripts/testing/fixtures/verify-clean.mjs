import fs from 'node:fs';
const file='artifacts/proof-fixtures/ledger.json';
const rows=fs.existsSync(file)?JSON.parse(fs.readFileSync(file,'utf8')):[];
const active=rows.filter(x=>x.cleanup_status!=='verified');
if(active.length){console.error(`PROOF FAILED — CLEANUP INCOMPLETE (${active.length} fixtures)`);process.exit(1);}
console.log('PASS proof fixture ledger clean');
