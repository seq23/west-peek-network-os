#!/usr/bin/env node
import fs from 'node:fs/promises';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { chromium } from '@playwright/test';

const lane = process.argv[2] || 'public';
const base = process.env.POSTDEPLOY_BASE_URL || process.env.SMOKE_BASE_URL;
if (!base || !/^https:\/\//.test(base) || /localhost|127\.0\.0\.1|example\.com/i.test(base)) {
  throw new Error('Explicit non-placeholder HTTPS POSTDEPLOY_BASE_URL or SMOKE_BASE_URL required');
}
const manifest = JSON.parse(await fs.readFile('config/deployed-route-manifest.json','utf8'));
const routes = manifest.routes.filter(r => lane === 'all' || (lane === 'role' ? r.authMode === 'role-specific' : r.authMode === lane));
const runId = process.env.PROOF_RUN_ID || `${manifest.repo}-${lane}-${new Date().toISOString().replace(/[-:.]/g,'')}`;
const out = path.resolve('artifacts/diagnostics/click-audit', runId);
await fs.mkdir(out,{recursive:true});
if (!routes.length) {
  const na={runId,repo:manifest.repo,lane,verdict:'NOT_APPLICABLE',reason:`No ${lane} routes declared in manifest`,generatedAt:new Date().toISOString()};
  await fs.writeFile(path.join(out,'summary.json'),JSON.stringify(na,null,2));
  await fs.writeFile(path.join(out,'na-ledger.json'),JSON.stringify(na,null,2));
  await fs.writeFile(path.join(out,'final-verdict.txt'),'NOT_APPLICABLE\n');
  console.log(`${lane} click audit: NOT APPLICABLE`); process.exit(0);
}
if (lane === 'authenticated' || lane === 'role') runAuthStatus();
const browser = await chromium.launch({headless: process.env.PLAYWRIGHT_HEADED !== '1'});
const results=[];
const viewports=[{name:'desktop',width:1280,height:800},{name:'mobile',width:375,height:667}];
const globalConsole=[]; const globalHttp=[]; const globalFailed=[];

try {
  for (const vp of viewports) {
    const grouped = groupByStorageState(routes, lane);
    for (const [storageState, roleRoutes] of grouped) {
      if(storageState) await validateStorageState(storageState,base);
      const context = await browser.newContext({viewport:{width:vp.width,height:vp.height}, ...(storageState ? {storageState} : {})});
      await context.tracing.start({screenshots:true,snapshots:true,sources:true});
      for (const r of roleRoutes) {
        const page=await context.newPage();
        const consoleErrors=[], failedRequests=[], httpErrors=[];
        page.on('console',m=>{if(m.type()==='error'){const x={routeId:r.id,text:m.text()};consoleErrors.push(x);globalConsole.push(x)}});
        page.on('requestfailed',q=>{const x={routeId:r.id,url:q.url(),error:q.failure()?.errorText||'unknown'};failedRequests.push(x);globalFailed.push(x)});
        page.on('response',resp=>{if(resp.status()>=400 && !isAllowedResponse(resp.url(),resp.status(),manifest)){const x={routeId:r.id,url:resp.url(),status:resp.status()};httpErrors.push(x);globalHttp.push(x)}});
        let status='PASS', error='';
        try {
          const resolved=resolvePath(r.path);
          const url=new URL(resolved,base).toString();
          const resp=await page.goto(url,{waitUntil:'networkidle',timeout:Number(process.env.CLICK_AUDIT_TIMEOUT_MS||30000)});
          if(!resp||resp.status()>=400) throw new Error(`HTTP ${resp?.status()??'none'}`);
          if((lane==='authenticated'||lane==='role')&&/\/login|\/auth\//i.test(new URL(page.url()).pathname)) throw new Error('AUTH_SESSION_EXPIRED: protected route fell back to auth wall');
          await executeSafeActions(page,r);
          await assertIdentity(page,r);
          await assertRenderableSurface(page,r);
          const overflow=await page.evaluate(()=>document.documentElement.scrollWidth>document.documentElement.clientWidth);
          if(overflow) throw new Error('UI_DISPLAY_NORMALIZATION_FAILED: horizontal overflow');
          const body=await page.locator('body').innerText();
          if(/<script|<div|�|\{\s*"[^"]+"\s*:/i.test(body)) throw new Error('UI_DISPLAY_NORMALIZATION_FAILED: raw payload marker');
          if(consoleErrors.length) throw new Error(`console: ${consoleErrors.map(x=>x.text).join(' | ')}`);
          if(failedRequests.length) throw new Error(`request failures: ${failedRequests.map(x=>x.url).join(' | ')}`);
          if(httpErrors.length) throw new Error(`HTTP subresource failures: ${httpErrors.map(x=>`${x.status} ${x.url}`).join(' | ')}`);
          await page.screenshot({path:path.join(out,`${vp.name}-${r.id}.png`),fullPage:true});
        } catch(e) { status='FAIL'; error=String(e?.message||e); }
        results.push({routeId:r.id,path:r.path,persona:r.persona,lane,viewport:vp.name,status,finalUrl:page.url(),consoleErrors,failedRequests,httpErrors,error,storageState:storageState?path.basename(storageState):null});
        await page.close();
      }
      const traceName=`trace-${vp.name}-${safeName(storageState||'public')}.zip`;
      await context.tracing.stop({path:path.join(out,traceName)});
      await context.close();
    }
  }
} finally { await browser.close(); }

const expectedChecks=routes.reduce((n,r)=>n+(r.viewports?.length||2),0);
const failures=results.filter(x=>x.status!=='PASS');
const visited=new Set(results.map(x=>`${x.routeId}:${x.viewport}`));
const missing=[];
for(const r of routes) for(const vp of (r.viewports||['desktop','mobile'])) if(!visited.has(`${r.id}:${vp}`)) missing.push({routeId:r.id,viewport:vp});
if(missing.length) failures.push(...missing.map(x=>({...x,status:'FAIL',error:'manifest route/viewport not visited'})));
const summary={runId,repo:manifest.repo,lane,targetUrl:base,routeCount:routes.length,expectedChecks,actualChecks:results.length,viewports,verdict:failures.length?'FAIL':'PASS',completionImpact:failures.length?'BLOCKS APPLICABLE RELEASE TIER':'APPLICABLE CLICK AUDIT PASSED',generatedAt:new Date().toISOString()};
await fs.writeFile(path.join(out,'summary.json'),JSON.stringify(summary,null,2));
await fs.writeFile(path.join(out,'route-results.json'),JSON.stringify(results,null,2));
await fs.writeFile(path.join(out,'console-errors.json'),JSON.stringify(globalConsole,null,2));
await fs.writeFile(path.join(out,'failed-requests.json'),JSON.stringify(globalFailed,null,2));
await fs.writeFile(path.join(out,'http-errors.json'),JSON.stringify(globalHttp,null,2));
await fs.writeFile(path.join(out,'manifest-coverage.json'),JSON.stringify({expectedChecks,actualChecks:results.length,missing,covered:[...visited].sort()},null,2));
await fs.writeFile(path.join(out,'na-ledger.json'),JSON.stringify({lane,notApplicable:false,reason:null},null,2));
await fs.writeFile(path.join(out,'final-verdict.txt'),`${summary.verdict}\n`);
console.log(`${lane} click audit: ${summary.verdict} (${results.length}/${expectedChecks} checks)`);
process.exit(failures.length?1:0);


async function validateStorageState(file,base){
  const raw=JSON.parse(await fs.readFile(file,'utf8'));
  if(!Array.isArray(raw.cookies)) throw new Error(`AUTH_SESSION_EXPIRED: ${file} missing cookies array`);
  const host=new URL(base).hostname; const now=Date.now()/1000;
  const matching=raw.cookies.filter(c=>host===String(c.domain||'').replace(/^\./,'')||host.endsWith(String(c.domain||'').replace(/^\./,'')));
  if(!matching.length) throw new Error(`AUTH_SESSION_EXPIRED: ${file} has no cookies for ${host}`);
  if(matching.every(c=>c.expires&&c.expires>0&&c.expires<=now)) throw new Error(`AUTH_SESSION_EXPIRED: ${file} cookies expired`);
}

function runAuthStatus(){
  const r=spawnSync('npm',['run','auth:status'],{stdio:'inherit',env:process.env});
  if(r.status!==0) throw new Error('AUTH_SESSION_EXPIRED: auth:status failed');
}
function groupByStorageState(routes,lane){
  if(lane==='public') return new Map([[null,routes]]);
  if(lane==='authenticated') return new Map([[process.env.PLAYWRIGHT_STORAGE_STATE||'.auth/playwright-storage-state.json',routes]]);
  const roleMap=parseRoleMap(); const grouped=new Map();
  for(const r of routes){const role=inferRole(r); const state=roleMap[role]||roleMap.default; if(!state) throw new Error(`AUTH_SESSION_EXPIRED: no storage state configured for role ${role}; set PLAYWRIGHT_ROLE_STATES_JSON`); if(!grouped.has(state)) grouped.set(state,[]); grouped.get(state).push({...r,resolvedRole:role});}
  return grouped;
}
function parseRoleMap(){try{return JSON.parse(process.env.PLAYWRIGHT_ROLE_STATES_JSON||'{}')}catch{throw new Error('PLAYWRIGHT_ROLE_STATES_JSON must be valid JSON')}}
function inferRole(r){
  if(r.role) return r.role; const p=r.path;
  if(/^\/client\//.test(p)) return 'client'; if(/^\/crew(?:\/|$)/.test(p)) return 'crew'; if(/^\/speaker(?:\/|$)/.test(p)) return 'speaker'; if(/^\/sponsor(?:\/|$)/.test(p)) return 'sponsor'; if(/^\/venue(?:\/|$)/.test(p)) return 'attendee'; if(/^\/production-access\/owner/.test(p)) return 'owner'; if(/^\/production-access\/operator/.test(p)) return 'operator'; if(/^\/production-access\/crew/.test(p)) return 'crew'; if(/^\/production-access\/special-guest/.test(p)) return 'special-guest'; if(/^\/admin\//.test(p)) return 'admin'; return 'operator';
}
function resolvePath(p){
  const vars={eventId:'PROOF_EVENT_ID',clientId:'PROOF_CLIENT_ID',clientSlug:'PROOF_CLIENT_SLUG',slug:'PROOF_EVENT_SLUG',eventCode:'PROOF_EVENT_CODE',boothId:'PROOF_BOOTH_ID',sessionId:'PROOF_SESSION_ID'};
  return p.replace(/\[([^\]]+)\]|:([A-Za-z0-9_]+)/g,(_,a,b)=>{const key=a||b,env=vars[key]||`PROOF_${key.replace(/([A-Z])/g,'_$1').toUpperCase()}`;const value=process.env[env];if(!value)throw new Error(`PROOF_FIXTURE_MISSING: ${env} required for ${p}`);return encodeURIComponent(value)});
}
function isAllowedResponse(url,status,manifest){return (manifest.allowedHttpFailures||[]).some(x=>new RegExp(x.pattern).test(url)&&(!x.statuses||x.statuses.includes(status)))}
async function executeSafeActions(page,r){
  for(const action of (r.safeActions||['navigate'])){
    if(action==='navigate'&&r.navigationLabel){const rx=new RegExp(`^${escapeRx(r.navigationLabel)}$`);const ctl=page.getByRole('button',{name:rx}).or(page.getByRole('link',{name:rx})).first();await ctl.click();await page.waitForLoadState('networkidle');}
    else if(action==='dismiss-banners'){const btn=page.getByRole('button',{name:/dismiss|close|got it/i}).first();if(await btn.count())await btn.click();}
    else if(action==='expand-details'){const btn=page.getByRole('button',{name:/details|more|expand/i}).first();if(await btn.count())await btn.click();}
    else if(action!=='navigate') throw new Error(`UNSUPPORTED_SAFE_ACTION: ${action}`);
  }
}
async function assertIdentity(page,r){
  if(r.expectedIdentity?.type==='heading') await page.getByRole('heading',{name:new RegExp(`^${escapeRx(r.expectedIdentity.value)}$`)}).waitFor();
  else if(r.expectedIdentity?.type==='route'){const expected=resolvePath(r.expectedIdentity.value).replace(/\/$/,'')||'/';const actual=new URL(page.url()).pathname.replace(/\/$/,'')||'/';if(expected!=='/'&&!actual.startsWith(expected))throw new Error(`route identity mismatch expected ${expected} got ${actual}`);}
  else if(r.expectedIdentity?.type==='selector') await page.locator(r.expectedIdentity.value).first().waitFor();
  else throw new Error(`missing/unsupported expectedIdentity for ${r.id}`);
}
async function assertRenderableSurface(page,r){
  const text=(await page.locator('body').innerText()).trim(); if(text.length<20) throw new Error(`route ${r.id} rendered insufficient content`);
  const landmark=page.locator('main, [role="main"], h1, h2').first(); if(!(await landmark.count())) throw new Error(`route ${r.id} has no main landmark or heading`);
  const focusable=page.locator('a[href],button,input,select,textarea,[tabindex]:not([tabindex="-1"])').first(); if(await focusable.count()){await focusable.focus(); const visible=await focusable.evaluate(el=>{const s=getComputedStyle(el);return s.outlineStyle!=='none'||s.boxShadow!=='none'||el.matches(':focus-visible')}); if(!visible&&process.env.CLICK_AUDIT_REQUIRE_FOCUS==='1')throw new Error('keyboard focus indicator missing');}
}
function escapeRx(v){return v.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')}
function safeName(v){return String(v).replace(/[^a-z0-9_-]+/gi,'-').slice(-80)}
