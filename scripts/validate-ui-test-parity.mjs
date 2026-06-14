import fs from "node:fs";import path from "node:path";
const root=process.cwd();const c=JSON.parse(fs.readFileSync(path.join(root,"_ui_test_parity_contract.json"),"utf8"));
const ex=new Set(["node_modules",".git","dist","build","out","coverage","artifacts","test-results","playwright-report"]);let files=[];
function walk(d){for(const e of fs.readdirSync(d,{withFileTypes:true})){if(ex.has(e.name)||e.name==="_ui_test_parity_contract.json")continue;const p=path.join(d,e.name);if(e.isDirectory())walk(p);else if(/\.(ts|tsx|js|jsx|mjs|cjs|md|json)$/.test(e.name))files.push(p)}}walk(root);
const corpus=files.map(f=>{try{return fs.readFileSync(f,"utf8")}catch{return""}}).join("\n");let bad=[];
for(const s of c.forbidden_stale_strings||[])if(corpus.includes(s))bad.push(`stale string still present: ${s}`);
for(const s of c.required_current_strings||[])if(!corpus.includes(s))bad.push(`required current string missing: ${s}`);
if(bad.length){console.error("UI/TEST PARITY: FAIL\n"+bad.join("\n"));process.exit(1)}console.log(`UI/TEST PARITY: PASS (${files.length} files scanned)`);
