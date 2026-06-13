import fs from 'node:fs/promises';
import path from 'node:path';
const [,,runId,testId,input='{}']=process.argv;
if(!runId||!testId){console.error('Usage: node write-diagnostic.mjs RUN_ID TEST_ID JSON');process.exit(2);}
const redact=(value)=>JSON.parse(JSON.stringify(value,(k,v)=>/secret|token|password|authorization|cookie|private.?key/i.test(k)?'[REDACTED]':v));
const payload=redact(JSON.parse(input));
const dir=path.join('artifacts','diagnostics',runId,testId);
await fs.mkdir(dir,{recursive:true});
const defaults={
 'summary.json':payload,
 'runtime-context.json':payload.runtime_context||{},
 'request-metadata.json':payload.request_metadata||{},
 'response-metadata.json':payload.response_metadata||{},
 'network.json':payload.network||[],
 'persistence-readback.json':payload.persistence_readback||{},
 'provider-evidence.json':payload.provider_evidence||{},
 'cleanup-report.json':payload.cleanup||{status:'not_applicable'}
};
for(const [name,value] of Object.entries(defaults)) await fs.writeFile(path.join(dir,name),JSON.stringify(value,null,2)+'\n');
await fs.writeFile(path.join(dir,'console.log'),String(payload.console||''));
console.log(dir);
