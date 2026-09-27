import { json,readJson } from '../../_shared/json';
import { appendRecord } from '../../_shared/sheets';
import { draftIntroduction,type AnthropicEnv } from '../../_shared/anthropic';
import { actor,contacts,introRows,formatError,fail,type IntroContext } from '../../_shared/introductions';
type Context=IntroContext<import('../../_shared/introductions').IntroEnv&AnthropicEnv>;
export async function onRequestPost({request,env}:Context) {
  try {
    const user=await actor(request,env),body=await readJson<{intro_id?:string;etiquette?:'ask_first'|'double';tone?:'warm'|'brief'}>(request);
    const current=(await introRows(env)).find((r)=>r.intro_id===body.intro_id);
    if(!current)return fail('Introduction not found.',404);
    if(!['suggested','drafted'].includes(String(current.status)))return fail('Only unsent suggestions can be drafted.',409);
    const b=(await contacts(env)).find((person)=>person.contact_id===current.person_b_id);
    const askRequired=b?.person_type==='investor'||String(b?.tags||'').toLowerCase().split(',').map((tag)=>tag.trim()).includes('lp');
    const etiquette=askRequired||body.etiquette==='ask_first'?'ask_first':'double';
    const draft=await draftIntroduction(env,{personA:String(current.person_a_name),personB:String(current.person_b_name),need:String(current.need_text),rationale:String(current.rationale),etiquette,tone:body.tone==='brief'?'brief':'warm'});
    const next={...current,status:'drafted',etiquette,draft_subject:draft.subject,draft_body:draft.body,ask_first_subject:draft.ask_first_subject,ask_first_body:draft.ask_first_body,approval_id:'',approved_by:'',approved_at:'',updated_at:new Date().toISOString(),updated_by:user};
    await appendRecord(env,'introductions',next);
    return json({ok:true,introduction:next,human_review_required:true,execution_allowed:false});
  }catch(error){return formatError(error);}
}
