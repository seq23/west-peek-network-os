import { json } from '../../_shared/json';
import { appendRecord, readTab } from '../../_shared/sheets';
import { actor, introRows, formatError, type IntroContext } from '../../_shared/introductions';
/** Weekly in-app reminder, generated once when an operator visits the Dashboard. No external email. */
export async function onRequestPost({request,env}:IntroContext) {
  try {
    const user=await actor(request,env);
    const now=new Date();const monday=new Date(Date.UTC(now.getUTCFullYear(),now.getUTCMonth(),now.getUTCDate()));monday.setUTCDate(monday.getUTCDate()-(monday.getUTCDay()+6)%7);
    const week=monday.toISOString().slice(0,10);
    const id=`intro_week_${week}_${user.replace(/[^a-z0-9]/gi,'_')}`;
    if((await readTab(env,'notifications')).some((row)=>row.notification_id===id))return json({ok:true,created:false});
    const suggestions=(await introRows(env)).filter((row)=>row.status==='suggested'&&row.requester_email===user).sort((a,b)=>Number(b.match_score||0)-Number(a.match_score||0)).slice(0,3);
    if(!suggestions.length)return json({ok:true,created:false});
    const stamp=now.toISOString();
    const record={notification_id:id,created_at:stamp,updated_at:stamp,recipient_email:user,notification_type:'introduction_suggestions',channel:'in_app',subject:`${suggestions.length} introductions worth reviewing`,body_preview:suggestions.map((row)=>`${row.person_a_name} ↔ ${row.person_b_name}`).join(' · '),entity_type:'introduction',entity_id:String(suggestions[0].intro_id),priority:'Normal',status:'unread'};
    await appendRecord(env,'notifications',record);
    return json({ok:true,created:true,notification:record});
  }catch(error){return formatError(error);}
}
