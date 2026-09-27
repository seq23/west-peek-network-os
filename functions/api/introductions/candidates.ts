import { json,readJson } from '../../_shared/json';
import { scoreCandidates } from '../../_shared/introScoring';
import { actor,contacts,introRows,normalizeSubject,formatError,fail,type IntroContext } from '../../_shared/introductions';
export async function onRequestPost({request,env}:IntroContext) {
  try {
    await actor(request,env);
    const body=await readJson<{subject?:Record<string,unknown>;need_text?:string}>(request);
    if (!body.subject || typeof body.need_text!=='string') return fail('Person and need are required.');
    const [people,existing]=await Promise.all([contacts(env),introRows(env)]);
    const subject=normalizeSubject(body.subject,people,body.need_text);
    const candidates=scoreCandidates(subject,people,existing,{targeted:true});
    return json({ok:true,subject,candidates,human_review_required:true,execution_allowed:false});
  } catch(error) { return formatError(error); }
}
