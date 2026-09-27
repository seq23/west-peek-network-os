/** Pure candidate selection. Only fields present in the persisted contacts tab are required. */
export type IntroContact = {
  contact_id: string; full_name?: string; email?: string; company?: string;
  status?: string; person_type?: string; relationship_owner?: string; priority?: string;
  tags?: string; context_summary?: string; dealflow_relevance?: string; founder_relevance?: string;
  created_at?: string; updated_at?: string;
};
export type IntroSubject = Partial<IntroContact> & { contact_id?: string; full_name: string; email: string; need_text: string };
export type IntroRow = { person_a_id?: string; person_b_id?: string; status?: string; updated_at?: string; created_at?: string; dismissed_reason?: string; decline_reason?: string };
export type ScoredIntro = { contact: IntroContact; score: number; breakdown: Record<string, number> };

const STOP = new Set('the and for with who this that from have they them will what where when about into your their need needs can are was were our you his her she he its'.split(' '));
export function tokens(value: unknown) { return [...new Set(String(value || '').toLowerCase().match(/[a-z0-9]{3,}/g)?.filter((word) => !STOP.has(word)) || [])]; }
export function introPairKey(a: string, b: string) { return [a.toLowerCase(), b.toLowerCase()].sort().join('|'); }
export function isIntroProof(...values: unknown[]) { return values.some((value) => /tier[ _-]?4|proof|fixture|e2e|smoke[_ -]?test|wpno-tier4/i.test(String(value || ''))); }

function blockedPairs(rows: IntroRow[], now: number) {
  const blocked = new Set<string>();
  for (const row of rows) {
    if (!row.person_a_id || !row.person_b_id) continue;
    const status = String(row.status || '');
    if (!['sent','archived'].includes(status) && (status !== 'declined' || now - Date.parse(String(row.updated_at || row.created_at || '')) < 90 * 86400000)) blocked.add(introPairKey(row.person_a_id,row.person_b_id));
  }
  return blocked;
}

const complementary: Record<string, Record<string, number>> = {
  founder: { investor: 20, operator: 14, lawyer: 13, service_provider: 10, media: 10 },
  investor: { founder: 20, investor: 7, operator: 8 },
  operator: { founder: 14, investor: 8 },
  lawyer: { founder: 13 }, service_provider: { founder: 10 }, media: { founder: 10 }
};

export function scoreCandidates(subject: IntroSubject, contacts: IntroContact[], introductions: IntroRow[] = [], options: { targeted?: boolean; limit?: number; now?: number } = {}): ScoredIntro[] {
  const now = options.now ?? Date.now();
  const blocked = blockedPairs(introductions, now);
  const subjectNeed = tokens(`${subject.need_text} ${subject.context_summary || ''}`);
  const subjectEmail = subject.email.toLowerCase();
  const output: ScoredIntro[] = [];
  for (const c of contacts) {
    const email = String(c.email || '').trim().toLowerCase();
    const tags = String(c.tags || '').toLowerCase().split(',').map((x) => x.trim());
    if (!c.contact_id || c.status === 'archived' || (options.targeted !== false && !email) || !email || email === subjectEmail || (subject.company && c.company && c.company.toLowerCase() === subject.company.toLowerCase()) || tags.includes('no-intros') || c.person_type === 'media' && options.targeted !== true || isIntroProof(c.full_name,c.email,c.contact_id) || (subject.contact_id && blocked.has(introPairKey(subject.contact_id,c.contact_id)))) continue;
    const corpus = tokens(`${c.context_summary || ''} ${c.tags || ''} ${c.company || ''} ${c.person_type || ''} ${c.dealflow_relevance || ''} ${c.founder_relevance || ''}`);
    const match = subjectNeed.filter((word) => corpus.some((other) => word === other || word.length > 5 && other.startsWith(word.slice(0,5)))).length;
    const lexical = subjectNeed.length ? Math.min(40,Math.round(40 * match / subjectNeed.length)) : 0;
    const role = complementary[String(subject.person_type || '').toLowerCase()]?.[String(c.person_type || '').toLowerCase()] || 0;
    const context = `${subject.need_text} ${subject.context_summary || ''}`.toLowerCase();
    const relevance = Math.min(15,(context.match(/invest|capital|fund|rais|lp|deal|founder/g)?.length || 0) * (c.dealflow_relevance || c.founder_relevance ? 3 : 0));
    const strength = (c.priority === 'High' ? 10 : c.priority === 'Normal' ? 5 : 2) + (c.relationship_owner && c.relationship_owner !== 'Unassigned' ? 5 : 0);
    const created = Date.parse(String(c.updated_at || c.created_at || ''));
    const recency = Number.isFinite(created) && now - created <= 180 * 86400000 ? 5 : 0;
    // Recent feedback about a candidate lowers future suggestions for other pairs, without turning it into an opt-out.
    const feedback = introductions.some((row) => row.person_b_id === c.contact_id && ['dismissed','declined'].includes(String(row.status)) && now - Date.parse(String(row.updated_at || row.created_at || '')) < 90 * 86400000 && /wrong fit|timing|already know|reject/i.test(String(row.dismissed_reason || row.decline_reason || ''))) ? -10 : 0;
    const breakdown = { lexical, role, relevance, strength, recency, feedback };
    const score = Object.values(breakdown).reduce((a,b)=>a+b,0);
    output.push({ contact:c,score,breakdown });
  }
  output.sort((a,b)=>b.score-a.score || a.contact.contact_id.localeCompare(b.contact.contact_id));
  return output.slice(0, options.limit ?? 40);
}
