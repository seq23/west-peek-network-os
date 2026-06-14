import { requireAuthenticatedUser, type AuthEnv } from '../../../_shared/auth';
import { json } from '../../../_shared/json';
import { validateSheetSchema, sheetsUnavailable, type RuntimeEnv } from '../../../_shared/sheets';

type Context = { request: Request; env: RuntimeEnv & AuthEnv };
export async function onRequestGet({ request, env }: Context) {
  try {
    await requireAuthenticatedUser(request, env);
    const tabs = await validateSheetSchema(env);
    return json({ ok: true, mutation_performed: false, tabs });
  } catch (error) {
    return sheetsUnavailable(error);
  }
}
