import fs from 'node:fs';
const p='config/deployed-route-manifest.json';
const m=JSON.parse(fs.readFileSync(p,'utf8'));
if(!Array.isArray(m.routes)||!m.routes.length) throw new Error('route manifest empty');
const ids=new Set();
for(const r of m.routes){for(const k of ['id','path','authMode','persona','criticality','viewports','expectedIdentity','safeActions','fixtureRequirements','persistenceRequired','cleanupPolicy']) if(!(k in r)) throw new Error(`route ${r.id||'?'} missing ${k}`);if(ids.has(r.id)) throw new Error(`duplicate route id ${r.id}`);ids.add(r.id);if(!Array.isArray(r.viewports)||!r.viewports.includes('desktop')||!r.viewports.includes('mobile')) throw new Error(`route ${r.id} missing dual viewport`);if(!['public','authenticated','role-specific'].includes(r.authMode)) throw new Error(`route ${r.id} invalid authMode`);}
console.log(`deployed route manifest: PASS (${m.routes.length} routes)`);
