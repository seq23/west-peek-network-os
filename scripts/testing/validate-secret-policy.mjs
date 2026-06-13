// GENERATED_BY=generic-testing-architecture-capability-installer
import fs from 'node:fs';
import { execFileSync } from 'node:child_process';
const contract = JSON.parse(fs.readFileSync('_repo_update_contract.json','utf8'));
const mode = contract.secrets?.mode;
const allowed = new Set(['vault_required','vault_preferred','plaintext_legacy']);
const failures=[]; const warnings=[];
if(!allowed.has(mode)) failures.push(`invalid secrets.mode: ${mode||'missing'}`);
let tracked=[];
try { tracked=execFileSync('git',['ls-files'],{encoding:'utf8',stdio:['ignore','pipe','ignore']}).split(/\r?\n/).filter(Boolean); } catch {}
const safeExample = f => /^\.env(?:\.[A-Za-z0-9_-]+)*\.example$/.test(f);
const forbidden=tracked.filter(f=>/^\.env(?:\.|$)/.test(f) && !safeExample(f));
if(forbidden.length) failures.push(`tracked real env files: ${forbidden.join(', ')}`);
for(const f of tracked){
  if(/\.(pem|key|p12|pfx)$/i.test(f)) failures.push(`tracked private-key material: ${f}`);
}
if(mode==='vault_required'){
  const hooks=contract.secrets?.required_hooks||{};
  for(const k of ['doctor','materialize','cleanup']) if(!hooks[k]) failures.push(`vault_required missing hook: ${k}`);
}
if(mode==='plaintext_legacy') warnings.push('plaintext_legacy requires an approved migration exception');
for(const x of warnings) console.warn(`WARN ${x}`);
for(const x of failures) console.error(`FAIL ${x}`);
if(failures.length) process.exit(1);
console.log(`PASS secret policy (${mode})`);
