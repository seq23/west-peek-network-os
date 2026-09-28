import { json,readJson } from '../../_shared/json';
import { appendRecord } from '../../_shared/sheets';
import { actor,contacts,introRows,formatError,fail,validEmail,type IntroContext } from '../../_shared/introductions';
export async function onRequestPost({request,env}:IntroContext) {
  try {
    const user=await actor(request,env),body=await readJson<{intro_id?:string;draft_subject?:string;draft_body?:string;ask_first_subject?:string;ask_first_body?:string;etiquette?:'ask_first'|'double'}>(request);
    const [current,people]=await Promise.all([introRows(env).then((rows)=>rows.find((r)=>r.intro_id===body.intro_id)),contacts(env)]);
    if(!current)return fail('Introduction not found.',404);
    if(current.status!=='drafted')return fail('Draft must be in reviewable state before submission.',409);
    const b=people.find((p)=>p.contact_id===current.person_b_id);
    const a=String(current.person_a_id||'').startsWith('external:')?null:people.find((p)=>p.contact_id===current.person_a_id);
    if(!b||b.status!=='active'||a&&a.status!=='active')return fail('A contact was archived or removed. Review the pair again.',409);
    if(!validEmail(current.person_a_email)||!validEmail(b.email)||String(current.person_a_email).toLowerCase()===String(b.email).toLowerCase())return fail('Two distinct valid recipient emails are required.',400);
    const subject=String(body.draft_subject||'').trim(),text=String(body.draft_body||'').trim(),askSubject=String(body.ask_first_subject||'').trim(),askText=String(body.ask_first_body||'').trim(),etiquette=body.etiquette==='ask_first'?'ask_first':'double';
    if(!subject||subject.length>200||!text||text.length>4000||etiquette==='ask_first'&&(!askSubject||!askText||askText.length>4000||askSubject.length>200))return fail('Review both subjects and message bodies. Subjects must be ≤200 and bodies ≤4000 characters.');
    if ((b.person_type==='investor'||String(b.tags||'').toLowerCase().split(',').map((tag)=>tag.trim()).includes('lp')) && etiquette!=='ask_first') return fail('Ask permission before introducing an investor or LP.',409);
    const owner=String(b.relationship_owner||'').toLowerCase();
    const assigned=owner==='sequoia'?'sequoia@westpeek.ventures':owner==='scooter'?'scooter@westpeek.ventures':user;
    const now=new Date().toISOString(),approvalId=`approval_intro_${crypto.randomUUID()}`;
    const next={...current,status:'pending_approval',draft_subject:subject,draft_body:text,ask_first_subject:askSubject,ask_first_body:askText,etiquette,approval_id:approvalId,updated_at:now,updated_by:user};
    await appendRecord(env,'introductions',next);
    const approval={approval_id:approvalId,created_at:now,updated_at:now,approval_type:'introduction_email',source_entity_type:'introduction',source_entity_id:current.intro_id,requested_by:user,assigned_to:assigned,relationship_owner:b.relationship_owner||'Unassigned',status:'pending',risk_level:'medium',suggested_payload:JSON.stringify({person_a:current.person_a_email,person_b:b.email,subject,body:text,ask_first_subject:askSubject,ask_first_body:askText,etiquette}),approved_by:'',approved_at:'',rejected_by:'',rejected_at:''};
    await appendRecord(env,'approvals',approval);
    return json({ok:true,introduction:next,approval,human_review_required:true,execution_allowed:false});
  }catch(error){return formatError(error);}
}
