import { requireAuthenticatedUser, type AuthEnv } from '../../_shared/auth';
import { json, readJson } from '../../_shared/json';
import { appendRecord, readTab, sheetsUnavailable, type RuntimeEnv } from '../../_shared/sheets';

type Env = RuntimeEnv & AuthEnv;
type Context = { request: Request; env: Env };
type Body = { event_name?: string; event_date?: string; location?: string; notes?: string; owner_email?: string; public_form_enabled?: boolean };

const MAX_TEXT = 1200;

export async function onRequestPost({ request, env }: Context) {
  try {
    const user = await requireAuthenticatedUser(request, env);
    const body = await readJson<Body>(request);
    const eventName = clean(body.event_name).slice(0, 140);
    if (!eventName) return json({ ok: false, error: 'event_name is required.' }, { status: 400 });
    const now = new Date().toISOString();
    const existing = await readTab(env, 'events');
    const baseSlug = slugify(eventName);
    const slug = uniqueSlug(baseSlug, existing);
    const event = {
      event_id: `event_${Date.now()}_${crypto.randomUUID().slice(0, 8)}`,
      created_at: now,
      updated_at: now,
      event_name: eventName,
      event_slug: slug,
      event_date: clean(body.event_date).slice(0, 80),
      location: clean(body.location).slice(0, 160),
      owner_email: clean(body.owner_email) || user.email,
      status: 'active',
      notes: clean(body.notes).slice(0, MAX_TEXT),
      public_form_enabled: body.public_form_enabled === false ? 'false' : 'true',
      public_form_url: `/e/${slug}`
    };
    await appendRecord(env, 'events', event);
    return json({ ok: true, event, public_form_url: `/e/${slug}`, persistence: 'google_sheets' });
  } catch (error) {
    const detail = error instanceof Error ? error.message : 'Could not create event.';
    if (detail.includes('Google Sheets')) return sheetsUnavailable(error);
    return json({ ok: false, error: detail }, { status: detail.includes('Authentication') ? 401 : 500 });
  }
}

function clean(value: unknown) { return String(value || '').trim(); }
function slugify(value: string) {
  return value.toLowerCase().replace(/&/g, ' and ').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 64) || `event-${Date.now()}`;
}
function uniqueSlug(base: string, rows: Array<Record<string, unknown>>) {
  const active = new Set(rows.map((row) => String(row.event_slug || '').trim()).filter(Boolean));
  if (!active.has(base)) return base;
  for (let index = 2; index < 1000; index += 1) {
    const candidate = `${base}-${index}`;
    if (!active.has(candidate)) return candidate;
  }
  return `${base}-${Date.now()}`;
}
