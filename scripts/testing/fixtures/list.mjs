import fs from 'node:fs';
const file='artifacts/proof-fixtures/ledger.json';
const rows=fs.existsSync(file)?JSON.parse(fs.readFileSync(file,'utf8')):[];
console.log(JSON.stringify(rows,null,2));
