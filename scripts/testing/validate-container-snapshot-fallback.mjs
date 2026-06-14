import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

const root = process.cwd();
const commands = [
  ['npm',['run','typecheck']],
  ['npm',['run','build']],
  ['npm',['run','validate:deployed-route-manifest']],
  ['npm',['run','validate:authenticated-usability-contract']],
  ['npm',['run','test:display-normalization']],
  ['npm',['run','test:critical-ui-data-flow']],
  ['npm',['run','test:ai-helper-approval-flow']],
  ['npm',['run','validate:playwright:maxdepth']],
  ['npm',['run','validate:baseline-package-contract']]
];
for (const [cmd,args] of commands) execFileSync(cmd,args,{cwd:root,stdio:'inherit',env:{...process.env,NODE_OPTIONS:'--max-old-space-size=3072'}});

const imageExt = /\.(png|jpe?g|webp)$/i;
const evidenceRoots = ['artifacts/diagnostics','test-results','docs','screenshots'];
const images = [];
function walk(dir){
  if(!fs.existsSync(dir)) return;
  for(const ent of fs.readdirSync(dir,{withFileTypes:true})){
    const p=path.join(dir,ent.name);
    if(ent.isDirectory()) walk(p);
    else if(imageExt.test(ent.name)) images.push(path.relative(root,p));
  }
}
for(const rel of evidenceRoots) walk(path.join(root,rel));
const reportDir=path.join(root,'artifacts','diagnostics','container-snapshot-fallback');
fs.mkdirSync(reportDir,{recursive:true});
const report={
  verdict:'PASS_WITH_LOCAL_BROWSER_REQUIRED',
  generatedAt:new Date().toISOString(),
  browserExecution:false,
  proves:['typecheck','production build','route contracts','display normalization','critical UI/data flow','AI Helper approval flow','static Playwright coverage','baseline packaging contract'],
  doesNotProve:['live DOM rendering','browser navigation','CSS/layout','focus behavior','responsive overlap','new screenshot capture'],
  screenshotEvidenceInventory:images,
  requiredNextStep:'Run npm run release:prepush locally where Chromium is available and capture current screenshots.'
};
fs.writeFileSync(path.join(reportDir,'summary.json'),JSON.stringify(report,null,2));
console.log(`container snapshot fallback: PASS (${images.length} screenshot/reference images inventoried)`);
console.log('STATUS: STRUCTURALLY CHECKED — LOCAL BROWSER VALIDATION REQUIRED');
