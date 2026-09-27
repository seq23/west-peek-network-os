import { readTab, type RuntimeEnv } from './sheets';
import { requireAuthenticatedUser, type AuthEnv } from './auth';
import { json } from './json';
import type { IntroContact } from './introScoring';

export type IntroEnv = RuntimeEnv & AuthEnv;
export type IntroContext<E extends IntroEnv = IntroEnv> = { request: Request; env: E };
export type IntroRecord = Record<string, unknown>;
export function latest(rows: IntroRecord[], idKey: string) {
  const records = new Map<string, IntroRecord>();
  for (const row of rows) {
    const id = String(row[idKey] || ''); if (!id) continue;
    const prev = records.get(id);
    if (!prev || Date.parse(String(row.updated_at || row.created_at || '')) >= Date.parse(String(prev.updated_at || prev.created_at || ''))) records.set(id,row);
  }
  return [...records.values()];
}
export async function introRows(env: RuntimeEnv) { return latest(await readTab(env,'introductions'),'intro_id'); }
export async function contacts(env: RuntimeEnv): Promise<IntroContact[]> { return latest(await readTab(env,'contacts'),'contact_id') as IntroContact[]; }
export async function actor(request: Request, env: AuthEnv) { return (await requireAuthenticatedUser(request,env)).email; }
export function fail(message: string, status = 400) { return json({ok:false,error:message,human_review_required:true,execution_allowed:false}, {status}); }
export function validEmail(value: unknown) { const email=String(value || '').trim().toLowerCase(); return email.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email); }
export function normalizeSubject(raw: Record<string,unknown>, people: IntroContact[], need: string) {
  const id=String(raw.contact_id || '');
  const person=id ? people.find((c)=>c.contact_id===id) : undefined;
  if (id && (!person || person.status !== 'active')) throw new Error('That person is no longer active in the network.');
  const email=String(person?.email || raw.email || '').trim().toLowerCase();
  const name=String(person?.full_name || raw.name || '').trim();
  if (!name || !validEmail(email)) throw new Error('A valid name and email are required for the person receiving matches.');
  if (!need.trim() || need.length>1500) throw new Error('Describe what they need in 1–1500 characters.');
  return {contact_id:person?.contact_id || `external:${email}`,full_name:name,email,company:String(person?.company || raw.company || '').trim(),person_type:String(person?.person_type || ''),context_summary:String(person?.context_summary || raw.context || '').slice(0,800),need_text:need.trim()};
}
export function formatError(error: unknown) { const msg=error instanceof Error ? error.message:'Request failed.';return fail(msg,/Authentication required/.test(msg)?401:/SHEETS_|Google Sheets/.test(msg)?503:400); }
