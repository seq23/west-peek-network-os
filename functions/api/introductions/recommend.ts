import { json,readJson } from '../../_shared/json';
import { appendRecord } from '../../_shared/sheets';
import { rankIntroductionCandidates, type AnthropicEnv } from '../../_shared/anthropic';
import { scoreCandidates,introPairKey,isIntroProof,type IntroContact,type IntroSubject } from '../../_shared/introScoring';
import { actor,contacts,introRows,normalizeSubject,formatError,fail,type IntroContext } from '../../_shared/introductions';

type Env = IntroContext<import('../../_shared/introductions').IntroEnv & AnthropicEnv>;
const tenMinutes=600_000;
export async function onRequestPost({request,env}:Env) {
  try {
    const user=await actor(request,env);
    const body=await readJson<{mode?:'targeted'|'recommended';subject?:Record<string,unknown>;need_text?:string;find_more?:boolean}>(request);
    if (!['targeted','recommended'].includes(String(body.mode))) return fail('Choose targeted or recommended mode.');
    const [people,existing]=await Promise.all([contacts(env),introRows(env)]);
    const now=Date.now();
    const recent=existing.filter((r)=>r.mode==='recommended' && r.requester_email===user && now-Date.parse(String(r.created_at || ''))<tenMinutes);
    if (body.mode==='recommended' && recent.length && !body.find_more) return json({ok:true,introductions:recent,cached:true,human_review_required:true,execution_allowed:false});
    let proposed:Array<{a:IntroSubject;b:IntroContact;score:number;breakdown:Record<string,number>}> = [];
    if (body.mode==='targeted') {
      if (!body.subject || typeof body.need_text!=='string') return fail('Person and need are required.');
      const subject=normalizeSubject(body.subject,people,body.need_text);
      proposed=scoreCandidates(subject,people,existing,{targeted:true}).map(({contact,score,breakdown})=>({a:subject,b:contact,score,breakdown}));
    } else {
      const eligible=people.filter((c)=>c.status==='active' && c.email && c.priority && c.person_type!=='media' && !isIntroProof(c.full_name,c.email,c.contact_id) && !String(c.tags||'').toLowerCase().split(',').map(x=>x.trim()).includes('no-intros'));
      eligible.sort((a,b)=>(b.priority==='High'?2:b.priority==='Normal'?1:0)-(a.priority==='High'?2:a.priority==='Normal'?1:0) || a.contact_id.localeCompare(b.contact_id));
      const shortlist=eligible.slice(0,150);
      const seen=new Set(existing.map((r)=>introPairKey(String(r.person_a_id||''),String(r.person_b_id||''))));
      for (const a of shortlist) {
        const subject:IntroSubject={...a,full_name:String(a.full_name||''),email:String(a.email||''),need_text:String(a.context_summary||a.person_type||'Relevant relationship')};
        for (const {contact:b,score,breakdown} of scoreCandidates(subject,shortlist,existing,{targeted:false,limit:40})) {
          const pair=introPairKey(a.contact_id,b.contact_id);
          if (a.contact_id===b.contact_id || seen.has(pair)) continue;
          seen.add(pair);proposed.push({a:subject,b,score,breakdown});
        }
      }
      proposed.sort((a,b)=>b.score-a.score);
      proposed=proposed.slice(0,25);
    }
    if (!proposed.length) return json({ok:true,introductions:[],reason:'No eligible pairs remain. Check opt-outs, emails, or the stated need.',human_review_required:true,execution_allowed:false});
    const candidates=proposed.map((p)=>({id:introPairKey(String(p.a.contact_id),p.b.contact_id),a:{name:p.a.full_name,company:p.a.company,type:p.a.person_type,need:p.a.need_text,context:String(p.a.context_summary||'').slice(0,800)},b:{name:p.b.full_name,company:p.b.company,type:p.b.person_type,tags:p.b.tags,context:String(p.b.context_summary||'').slice(0,400)},score:p.score}));
    let ranked:Awaited<ReturnType<typeof rankIntroductionCandidates>>['ranked']=[];
    let discarded_ids:string[]=[];let aiError='';
    try { ({ranked,discarded_ids}=await rankIntroductionCandidates(env,{mode:body.mode,requested_by:user},candidates)); }
    catch(error) { aiError=error instanceof Error?error.message:'Claude unavailable'; }
    const pick=ranked.length?ranked.map((r)=>({match:proposed.find((p)=>introPairKey(String(p.a.contact_id),p.b.contact_id)===r.candidate_id),rank:r})).filter((x)=>x.match).slice(0,8):proposed.slice(0,8).map((match)=>({match,rank:null}));
    const saved=[];
    for (const entry of pick) {
      const p=entry.match!; const r=entry.rank; const stamp=new Date().toISOString();
      const row={intro_id:`intro_${crypto.randomUUID()}`,created_at:stamp,updated_at:stamp,status:'suggested',mode:body.mode,requester_email:user,person_a_id:p.a.contact_id,person_a_name:p.a.full_name,person_a_email:p.a.email,person_a_company:p.a.company||'',person_a_external:String(p.a.contact_id).startsWith('external:'),person_b_id:p.b.contact_id,person_b_name:p.b.full_name||'',person_b_email:p.b.email||'',person_b_company:p.b.company||'',need_text:p.a.need_text,match_score:p.score,ai_confidence:r?.confidence||'low',rationale:(r?.rationale_a||'Rule-ranked match; review the context before introducing.').slice(0,600),rationale_a:r?.rationale_a||'',rationale_b:r?.rationale_b||'',etiquette:(p.b.person_type==='investor'||String(p.b.tags||'').toLowerCase().split(',').map((tag)=>tag.trim()).includes('lp'))?'ask_first':r?.suggested_etiquette||'double',internal_data_trace:JSON.stringify({breakdown:p.breakdown,ai_error:aiError,discarded_ids,source:'matching',human_review_required:true,execution_allowed:false}),created_by:user,updated_by:user};
      await appendRecord(env,'introductions',row);saved.push(row);
    }
    return json({ok:true,introductions:saved,ranking:aiError?'rules_only':'claude',warning:aiError || undefined,internal_data_trace:{discarded_ids},human_review_required:true,execution_allowed:false});
  }catch(error){return formatError(error);}
}
