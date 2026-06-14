import fs from 'node:fs';
const p='config/deployed-route-manifest.json';
const m=JSON.parse(fs.readFileSync(p,'utf8'));
if(!Array.isArray(m.routes)||!m.routes.length) throw new Error('route manifest empty');
const ids=new Set();
const mobileRequired=new Set(['dashboard','add-person','capture-studio','intake-queue','network','touchpoints','settings']);
for(const r of m.routes){
  for(const k of ['id','path','authMode','persona','criticality','viewports','expectedIdentity','safeActions','fixtureRequirements','persistenceRequired','cleanupPolicy']) if(!(k in r)) throw new Error(`route ${r.id||'?'} missing ${k}`);
  if(ids.has(r.id)) throw new Error(`duplicate route id ${r.id}`);
  ids.add(r.id);
  if(!Array.isArray(r.viewports)||!r.viewports.includes('desktop')) throw new Error(`route ${r.id} missing required desktop viewport`);
  if(mobileRequired.has(r.id)&&!r.viewports.includes('mobile')) throw new Error(`risk-heavy route ${r.id} missing required mobile viewport`);
  if(!mobileRequired.has(r.id)&&r.viewports.includes('mobile')) throw new Error(`route ${r.id} exceeds approved mobile audit scope; update the risk contract deliberately`);
  if(!['public','authenticated','role-specific'].includes(r.authMode)) throw new Error(`route ${r.id} invalid authMode`);
}
for(const id of mobileRequired) if(!ids.has(id)) throw new Error(`required mobile risk route missing: ${id}`);
console.log(`deployed route manifest: PASS (${m.routes.length} desktop routes; ${mobileRequired.size} mobile risk routes)`);
