import fs from 'node:fs';
const p='DIAGNOSTICS_ROUTING_MATRIX.json';
if(!fs.existsSync(p)) throw new Error('Missing '+p);
const x=JSON.parse(fs.readFileSync(p,'utf8'));
for(const k of ['fullPacketRequiredFor','lightweightOnlyFor','requiredFields']) if(!Array.isArray(x[k])||x[k].length===0) throw new Error('Invalid diagnostics routing: '+k);
const overlap=x.fullPacketRequiredFor.filter(v=>x.lightweightOnlyFor.includes(v));
if(overlap.length) throw new Error('Diagnostics category overlap: '+overlap.join(','));
console.log('Diagnostics routing matrix: PASS');
