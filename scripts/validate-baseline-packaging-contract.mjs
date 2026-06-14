import fs from 'node:fs';
import path from 'node:path';

const root=process.cwd();
const artifactMode=process.argv.includes('--artifact');
const contractPath=path.join(root,'_baseline_packaging_contract.json');
if(!fs.existsSync(contractPath)){console.error('BASELINE_PACKAGE_CONTRACT_MISSING');process.exit(1);}
const c=JSON.parse(fs.readFileSync(contractPath,'utf8'));
const missing=(c.required_root_files||[]).filter(p=>!fs.existsSync(path.join(root,p)));
const forbidden=[];
if(artifactMode){
  for(const p of c.forbidden_paths_or_globs||[]){
    const clean=p.replace(/\/$/,'');
    if(fs.existsSync(path.join(root,clean))) forbidden.push(p);
  }
}
if(missing.length||forbidden.length){
  console.error(JSON.stringify({result:'FAIL',mode:artifactMode?'artifact':'source',missing,forbidden},null,2));
  process.exit(1);
}
console.log(JSON.stringify({result:'PASS',mode:artifactMode?'artifact':'source',repo:c.repo_name,required_checked:c.required_root_files.length},null,2));
