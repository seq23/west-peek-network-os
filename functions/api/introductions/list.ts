import { json } from '../../_shared/json';
import { actor, introRows, formatError, type IntroContext } from '../../_shared/introductions';
export async function onRequestGet({request,env}:IntroContext) {
  try { await actor(request,env); return json({ok:true,introductions:await introRows(env),human_review_required:true,execution_allowed:false}); }
  catch(error) { return formatError(error); }
}
