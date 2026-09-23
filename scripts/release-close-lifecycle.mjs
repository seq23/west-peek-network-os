#!/usr/bin/env node
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
const root=process.cwd();
const pkg=JSON.parse(fs.readFileSync(path.join(root,'package.json'),'utf8'));
const dryRun=process.argv.includes('--dry-run')||process.env.RELEASE_CLOSE_DRY_RUN==='1';
const stamp=new Date().toISOString().replace(/[:.]/g,'-');
const lifecycleRunId=process.env.RELEASE_CLOSE_RUN_ID||`${pkg.name}-close-${stamp}`;
// The default must match the id shape Tier 4 and the phased click audit accept (wpno-tier4-*), or a
// populated audit refuses the run as PROOF_FIXTURE_MISSING.
const proofRunId=process.env.WEST_PEEK_E2E_RUN_ID||process.env.PROOF_RUN_ID||`wpno-tier4-${stamp}`;
const outDir=path.join(root,'artifacts','diagnostics','lifecycle-close',lifecycleRunId); fs.mkdirSync(outDir,{recursive:true});
const required=['release:postpush','release:live-proof','release:cleanup','postcleanup:integrity','release:report'];
for(const n of required) if(!pkg.scripts?.[n]) throw new Error(`Missing package script ${n}`);
const stages=[
  { id: "postdeploy-proof", command: "npm run release:postpush", always: false, requiresCleanup: false },
  { id: "live-proof", command: "npm run release:live-proof", always: false, requiresCleanup: false },
  // CLICK_AUDIT_PHASE=populated makes the audit prove it is looking at THIS run's passed Tier 4 data;
  // without it the audit runs as "standalone" and skips that check.
  { id: "populated-click-audit", command: "npm run postdeploy:authenticated-click-audit", always: false, requiresCleanup: false, env: { CLICK_AUDIT_PHASE: "populated", CLICK_AUDIT_RUN_ID: `${proofRunId}-populated` } },
  { id: "exact-cleanup", command: "npm run release:cleanup", always: true, requiresCleanup: false },
  { id: "post-cleanup-integrity", command: "npm run postcleanup:integrity", always: false, requiresCleanup: true },
  { id: "final-proof-report", command: "npm run release:report", always: true, requiresCleanup: false }
];
const summary={schemaVersion:2,repo:pkg.name,lifecycleRunId,proofRunId,dryRun,startedAt:new Date().toISOString(),sequence:stages.map(x=>({id:x.id,command:x.command,env:x.env||{}})),results:[],verdict:'RUNNING'};
const write=()=>fs.writeFileSync(path.join(outDir,'summary.json'),JSON.stringify(summary,null,2)+'\n'); write();
function run(stage){return new Promise(resolve=>{const logPath=path.join(outDir,`${stage.id}.log`);if(dryRun){fs.writeFileSync(logPath,`DRY RUN\n$ ${stage.command}\n`);return resolve({...stage,status:'DRY_RUN',exitCode:0,log:path.relative(root,logPath)})}const log=fs.createWriteStream(logPath);const child=spawn(stage.command,{cwd:root,shell:true,env:{...process.env,NODE_OPTIONS:process.env.NODE_OPTIONS||'--max-old-space-size=3072',RELEASE_CLOSE_RUN_ID:lifecycleRunId,PROOF_RUN_ID:proofRunId,WEST_PEEK_E2E_RUN_ID:proofRunId,...(stage.env||{})}});child.stdout.on('data',x=>{process.stdout.write(x);log.write(x)});child.stderr.on('data',x=>{process.stderr.write(x);log.write(x)});child.on('close',code=>{log.end();resolve({...stage,status:code===0?'PASS':'FAIL',exitCode:code??1,log:path.relative(root,logPath)})})})}
let failed=false,cleanupPassed=false;for(const stage of stages){if(!stage.always&&(failed||(stage.requiresCleanup&&!cleanupPassed))){summary.results.push({...stage,status:'SKIPPED',reason:'Earlier stage failed or cleanup did not pass.'});write();continue}const r=await run(stage);summary.results.push(r);if(stage.id==='exact-cleanup')cleanupPassed=r.status==='PASS'||r.status==='DRY_RUN';if(r.status==='FAIL')failed=true;write()}
summary.endedAt=new Date().toISOString();summary.verdict=dryRun?'DRY_RUN_PASS':(failed?'FAIL':'PASS');write();console.log(`# RELEASE LIFECYCLE CLOSURE\n\nRepo: ${pkg.name}\nVerdict: ${summary.verdict}\n`);process.exit(summary.verdict.endsWith('PASS')?0:1);
