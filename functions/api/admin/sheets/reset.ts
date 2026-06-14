import { requireAuthenticatedUser, type AuthEnv } from '../../../_shared/auth';
import { json, readJson } from '../../../_shared/json';
import { resetSheetWorkbook, sheetsUnavailable, type RuntimeEnv } from '../../../_shared/sheets';

type Context = { request: Request; env: RuntimeEnv & AuthEnv };
const CONFIRM = 'RESET_EMPTY_WEST_PEEK_NETWORK_WORKBOOK';
export async function onRequestPost({ request, env }: Context) {
  try {
    const user = await requireAuthenticatedUser(request, env);
    const body = await readJson<{ confirm?: string }>(request);
    if (body.confirm !== CONFIRM) return json({ ok: false, error_code: 'SHEETS_RESET_CONFIRMATION_REQUIRED', error: `confirm must equal ${CONFIRM}.` }, { status: 400 });
    const tabs = await resetSheetWorkbook(env);
    return json({ ok: true, reset_by: user.email, destructive_reset: true, tabs });
  } catch (error) {
    return sheetsUnavailable(error);
  }
}
