import { requireAuthenticatedUser, type AuthEnv } from '../../_shared/auth';
import { json, readJson } from '../../_shared/json';
import { appendRecord, readTab, sheetsUnavailable, TAB_HEADERS, type RuntimeEnv } from '../../_shared/sheets';
import { projectKnownFields } from '../../_shared/recordProjection';
import { latestRecord } from '../../_shared/records';
export async function onRequestPost({request,env}:{request:Request;env:RuntimeEnv&AuthEnv}) {
  try {
    const user=await requireAuthenticatedUser(request,env);
    const body=await readJson<{contact_id?:string;no_intros?:boolean}>(request);
    if(!body.contact_id||typeof body.no_intros!=='boolean')return json({ok:false,error:'Contact and opt-out choice are required.'},{status:400});
    const current=latestRecord((await readTab(env,'contacts')).filter((row)=>row.contact_id===body.contact_id));
    if(!current)return json({ok:false,error:'Contact not found.'},{status:404});
    const tags=String(current.tags||'').split(',').map((tag)=>tag.trim()).filter((tag)=>tag && tag.toLowerCase()!=='no-intros');
    if(body.no_intros)tags.push('no-intros');
    const next=projectKnownFields({...current,tags:tags.join(', '),updated_at:new Date().toISOString(),updated_by:user.email},TAB_HEADERS.contacts);
    await appendRecord(env,'contacts',next);
    return json({ok:true,contact:next});
  }catch(error){return sheetsUnavailable(error);}
}
