import { requireAuthenticatedUser, type AuthEnv } from '../../_shared/auth';
import { json, readJson } from '../../_shared/json';
import { appendRecord, readTab, sheetsUnavailable, type RuntimeEnv } from '../../_shared/sheets';

type Context = { request: Request; env: RuntimeEnv & AuthEnv };

export async function onRequestPost({ request, env }: Context) {
  let user: { email: string };
  try {
    user = await requireAuthenticatedUser(request, env);
  } catch (error) {
    return json({ ok: false, error: error instanceof Error ? error.message : 'Authentication required.' }, { status: 401 });
  }
  const body = await readJson<Record<string, unknown>>(request);
  const fullName = String(body.full_name || body.email || body.company || 'Unnamed relationship').trim();
  if (!fullName && !body.email && !body.company && !body.context_summary) return json({ ok: false, error: 'At least one identifying field is required.' }, { status: 400 });
  const now = new Date().toISOString();
  const contact = {
    contact_id: String(body.contact_id || `contact_${Date.now()}_${crypto.randomUUID().slice(0, 8)}`),
    created_at: String(body.created_at || now),
    updated_at: now,
    status: 'active',
    full_name: fullName,
    email: String(body.email || ''),
    company: String(body.company || ''),
    relationship_owner: String(body.relationship_owner || 'Unassigned'),
    priority: String(body.priority || 'Normal'),
    tags: Array.isArray(body.tags) ? body.tags.join(', ') : String(body.tags || ''),
    context_summary: String(body.context_summary || 'Captured with minimal name/email context. Enrich later.'),
    touch_needed: String(Boolean(body.touch_needed)),
    touch_status: body.touch_needed ? 'needed' : '',
    created_by: user.email || String(body.created_by || 'unknown'),
    updated_by: user.email || String(body.updated_by || 'unknown')
  };
  try {
    const rows = await readTab(env, 'contacts');
    const duplicate = rows.find((row: Record<string, unknown>) => String(row.email || '').trim().toLowerCase() === contact.email.trim().toLowerCase() && contact.email);
    if (duplicate) return json({ ok: false, error: 'This person may already be in the West Peek Network.', duplicate }, { status: 409 });
    await appendRecord(env, 'contacts', contact);
  } catch (error) {
    return sheetsUnavailable(error);
  }
  return json({ ok: true, contact, persistence: 'google_sheets' });
}
