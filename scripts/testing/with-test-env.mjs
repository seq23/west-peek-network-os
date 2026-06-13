// GENERATED_BY=generic-testing-architecture-capability-installer
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
const argv=process.argv.slice(2); const sep=argv.indexOf('--');
if(sep<0 || !argv[sep+1]){ console.error('Usage: node scripts/testing/with-test-env.mjs --mode fixture|vault-test|live-provider -- COMMAND [ARGS...]'); process.exit(2); }
const modeArg=argv.find((x,i)=>argv[i-1]==='--mode') || 'fixture';
if(!['fixture','vault-test','live-provider'].includes(modeArg)){ console.error(`Invalid mode: ${modeArg}`); process.exit(2); }
const contract=JSON.parse(fs.readFileSync('_repo_update_contract.json','utf8'));
const hooks=contract.secrets?.required_hooks||{};
const tempDir=fs.mkdtempSync(path.join(os.tmpdir(),`${contract.repo_name||'repo'}-test-env-`));
const envFile=path.join(tempDir,'.env.runtime');
let cleanupFailed=false;
function parseEnv(file){ const out={}; if(!fs.existsSync(file)) return out; for(const raw of fs.readFileSync(file,'utf8').split(/\r?\n/)){ const line=raw.trim(); if(!line||line.startsWith('#')||!line.includes('=')) continue; const i=line.indexOf('='); const k=line.slice(0,i).trim(); let v=line.slice(i+1); if((v.startsWith('"')&&v.endsWith('"'))||(v.startsWith("'")&&v.endsWith("'"))) v=v.slice(1,-1); if(/^[A-Za-z_][A-Za-z0-9_]*$/.test(k)) out[k]=v; } return out; }
function runHook(command,args=[]){ if(!command) throw new Error('Required secret hook is not configured'); const r=spawnSync(command,{shell:true,stdio:'inherit',env:{...process.env,TEST_ENV_MODE:modeArg,TEST_ENV_OUTPUT:envFile,TEST_ENV_ARGS:JSON.stringify(args)}}); if(r.status!==0) throw new Error(`Secret hook failed: ${command}`); }
let status=1;
let interruptedSignal='';
for (const signal of ['SIGINT','SIGTERM','SIGHUP']) {
  process.on(signal, () => { interruptedSignal=signal; });
}
try{
  if(modeArg==='fixture'){
    const src=fs.existsSync('.env.test')?'.env.test':'.env.test.example';
    if(fs.existsSync(src)) fs.copyFileSync(src,envFile); else fs.writeFileSync(envFile,'NODE_ENV=test\n',{mode:0o600});
  } else {
    runHook(hooks.doctor);
    runHook(hooks.materialize,[modeArg,envFile]);
    if(!fs.existsSync(envFile)) throw new Error('Vault hook did not create TEST_ENV_OUTPUT');
  }
  fs.chmodSync(envFile,0o600);
  const [cmd,...args]=argv.slice(sep+1);
  const r=spawnSync(cmd,args,{stdio:'inherit',env:{...process.env,...parseEnv(envFile),TEST_ENV_MODE:modeArg}});
  if (r.error) throw r.error;
  status=r.status??1;
  if (r.signal && !interruptedSignal) interruptedSignal=r.signal;
} catch(error){ console.error(error instanceof Error?error.message:String(error)); status=1; }
finally{
  try { if(modeArg!=='fixture' && hooks.cleanup) runHook(hooks.cleanup,[modeArg,envFile]); } catch(error){ cleanupFailed=true; console.error(`Cleanup hook failed: ${error instanceof Error?error.message:String(error)}`); }
  try { fs.rmSync(tempDir,{recursive:true,force:true}); } catch { cleanupFailed=true; }
}
if(cleanupFailed){ console.error('PROOF FAILED — SECRET CLEANUP INCOMPLETE'); process.exit(1); }
if(interruptedSignal){ console.error(`Test command interrupted by ${interruptedSignal}; cleanup completed.`); process.exit(130); }
process.exit(status);
