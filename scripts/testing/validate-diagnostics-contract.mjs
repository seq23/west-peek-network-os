import fs from 'node:fs';
const doc=fs.readFileSync('DIAGNOSTICS_STANDARD.md','utf8');
const required=['summary.json','runtime-context.json','request-metadata.json','response-metadata.json','console.log','network.json','persistence-readback.json','provider-evidence.json','cleanup'];
const missing=required.filter(x=>!doc.includes(x));
if(missing.length){console.error(`Missing diagnostics contract entries: ${missing.join(', ')}`);process.exit(1);}
console.log('PASS diagnostics contract');
