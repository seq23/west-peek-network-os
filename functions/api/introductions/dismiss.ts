import { json,readJson } from '../../_shared/json';
import { appendRecord } from '../../_shared/sheets';
import { actor,introRows,formatError,fail,type IntroContext } from '../../_shared/introductions';
export async function onRequestPost({request,env}:IntroContext) {
  try {
    const user=await actor(request,env),body=await readJson<{intro_id?:string;reason?:string}>(request);
    const rows=await introRows(env),current=rows.find((r)=>r.intro_id===body.intro_id);
    if (!current) return fail('Introduction not found.',404);
    if (!['suggested','drafted'].includes(String(current.status))) return fail('Only unsent suggestions or drafts may be dismissed.',409);
    const next={...current,status:'dismissed',dismissed_reason:String(body.reason||'Not now').slice(0,300),updated_at:new Date().toISOString(),updated_by:user};
    await appendRecord(env,'introductions',next);
    return json({ok:true,introduction:next,human_review_required:true,execution_allowed:false});
  }catch(error){return formatError(error);}
}
