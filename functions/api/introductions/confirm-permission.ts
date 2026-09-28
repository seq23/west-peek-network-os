import { json, readJson } from '../../_shared/json';
import { appendRecord, readTab } from '../../_shared/sheets';
import { actor, introRows, formatError, fail, type IntroContext } from '../../_shared/introductions';
export async function onRequestPost({ request, env }: IntroContext) {
  try {
    const user = await actor(request, env);
    const body = await readJson<{ intro_id?: string; confirmed?: boolean }>(request);
    if (body.confirmed !== true) return fail('Confirm that the recipient explicitly agreed to this introduction.');
    const intro = (await introRows(env)).find((row) => row.intro_id === body.intro_id);
    if (!intro || intro.status !== 'permission_sent' || intro.etiquette !== 'ask_first') return fail('A sent permission request is required.', 409);
    const approval = (await readTab(env, 'approvals')).filter((row) => row.approval_id === intro.approval_id).at(-1);
    if (approval?.status !== 'approved') return fail('Owner approval is required.', 409);
    const next = { ...intro, status: 'permission_confirmed', permission_confirmed_at: new Date().toISOString(), permission_confirmed_by: user, updated_at: new Date().toISOString(), updated_by: user };
    await appendRecord(env, 'introductions', next);
    return json({ ok: true, introduction: next });
  } catch (error) { return formatError(error); }
}
