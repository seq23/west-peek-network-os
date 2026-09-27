import { json } from '../../_shared/json';
import { readTab } from '../../_shared/sheets';
import { actor, formatError, type IntroContext } from '../../_shared/introductions';
export async function onRequestGet({request,env}:IntroContext<{ INTRO_SEND_GUARD?: unknown } & IntroContext['env']>) {
  try {
    const user=await actor(request,env);
    const rows=await readTab(env,'oauth_tokens');
    const scope='https://www.googleapis.com/auth/gmail.send';
    const connected=rows.some((row)=>row.provider==='google'&&row.status==='active'&&String(row.user_email).toLowerCase()===user&&String(row.scope||'').split(' ').includes(scope));
    return json({ok:true,ready:Boolean(env.INTRO_SEND_GUARD)&&connected,connected,guard_configured:Boolean(env.INTRO_SEND_GUARD),reason:!env.INTRO_SEND_GUARD?'In-app sending is awaiting the durable send guard deployment.':!connected?'Reconnect Google in Settings to grant Gmail sending.':''});
  } catch(error) { return formatError(error); }
}
