export const canonicalTrigger = '#wpnetwork';
export const acceptedAliases = ['#addtowestpeek', '#westpeeknetwork'];
export const allTriggers = [canonicalTrigger, ...acceptedAliases];

export type ParsedWestPeekTriggerFields = {
  name?: string;
  email?: string;
  phone?: string;
  company?: string;
  title?: string;
  website?: string;
  context?: string;
  notes?: string;
  owner?: string;
  touch?: string;
  priority?: string;
  due?: string;
  needs_touch?: string;
  raw_unstructured_context?: string;
};

const FIELD_ALIASES: Record<string, keyof ParsedWestPeekTriggerFields> = {
  name: 'name',
  person: 'name',
  contact: 'name',
  email: 'email',
  'e-mail': 'email',
  phone: 'phone',
  mobile: 'phone',
  cell: 'phone',
  company: 'company',
  co: 'company',
  'company name': 'company',
  firm: 'company',
  fund: 'company',
  title: 'title',
  role: 'title',
  website: 'website',
  site: 'website',
  linkedin: 'website',
  context: 'context',
  note: 'notes',
  notes: 'notes',
  why: 'context',
  owner: 'owner',
  assigned: 'owner',
  'relationship owner': 'owner',
  touch: 'touch',
  'touch type': 'touch',
  'type of touch': 'touch',
  method: 'touch',
  followup: 'touch',
  'follow up': 'touch',
  'follow-up': 'touch',
  priority: 'priority',
  due: 'due',
  'due date': 'due',
  when: 'due',
  'needs touch': 'needs_touch',
  needstouch: 'needs_touch',
  'needs follow up': 'needs_touch',
  'needs follow-up': 'needs_touch'
};

export function containsTrigger(text: string) {
  const lower = text.toLowerCase();
  return allTriggers.some((trigger) => lower.includes(trigger));
}

export function parseFields(text: string): ParsedWestPeekTriggerFields {
  const fields: ParsedWestPeekTriggerFields = {};
  for (const line of text.split(/\r?\n/)) {
    const match = line.match(/^\s*([^:#]+):\s*(.*?)\s*$/);
    if (!match) continue;
    const key = normalizeKey(match[1]);
    const canonical = FIELD_ALIASES[key];
    if (!canonical) continue;
    const value = match[2].trim();
    if (value) fields[canonical] = value;
  }

  const freeform = stripTriggersAndStructuredLines(text);
  const email = fields.email || extractEmail(text);
  if (email) fields.email = email;
  const phone = fields.phone || extractPhone(text);
  if (phone) fields.phone = phone;
  if (!fields.name) fields.name = inferNameFromFreeform(freeform, fields.email);
  if (!fields.company) fields.company = inferCompanyFromFreeform(freeform);
  if (!fields.context && !fields.notes && freeform) fields.raw_unstructured_context = freeform;
  return fields;
}

export function normalizeOwner(value: unknown) {
  const text = String(value || '').trim().toLowerCase();
  if (text.includes('sequoia')) return 'Sequoia';
  if (text.includes('scooter')) return 'Scooter';
  return '';
}

export function normalizePriority(value: unknown) {
  const text = String(value || '').trim().toLowerCase();
  if (text.includes('high') || text.includes('urgent') || text.includes('this week')) return 'High';
  if (text.includes('low')) return 'Low';
  if (text.includes('normal') || text.includes('medium')) return 'Normal';
  return '';
}

export function normalizeTouch(value: unknown) {
  const text = String(value || '').trim().toLowerCase().replace(/[_-]+/g, ' ');
  if (!text) return '';
  if (text.includes('handwritten') || text.includes('hand written')) return 'handwritten_note';
  if (text.includes('virtual') && text.includes('thank')) return 'virtual_thank_you_card';
  if (text.includes('thank') && text.includes('card')) return 'virtual_thank_you_card';
  if (text.includes('gift')) return 'gift';
  if (text.includes('intro')) return 'intro';
  if (text.includes('call')) return 'call';
  if (text.includes('meeting')) return 'meeting';
  if (text.includes('event')) return 'event_invite';
  if (text.includes('email') || text.includes('e mail')) return 'email';
  if (text.includes('follow')) return 'email';
  if (text.includes('undecided')) return 'undecided';
  return 'other';
}

export function inferNeedsTouch(text: string, explicit?: string, touch?: string) {
  const value = String(explicit || '').trim().toLowerCase();
  if (/^(yes|true|y|1|required|needed)$/i.test(value)) return true;
  if (/^(no|false|n|0)$/i.test(value)) return false;
  if (touch && touch !== 'undecided') return true;
  return /thank\s*-?\s*you|handwritten|follow\s*-?\s*up|circle back|send|intro|touch|due/i.test(text);
}

function normalizeKey(key: string) {
  return key.trim().toLowerCase().replace(/[\s_\-]+/g, ' ');
}

function stripTriggersAndStructuredLines(text: string) {
  return text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .filter((line) => !allTriggers.includes(line.toLowerCase()))
    .filter((line) => !/^\s*([^:#]+):\s*(.*?)\s*$/.test(line))
    .join(' ')
    .replace(/#wpnetwork|#addtowestpeek|#westpeeknetwork/gi, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function extractEmail(text: string) {
  return text.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i)?.[0] || '';
}

function extractPhone(text: string) {
  return text.match(/(?:\+?1[\s.-]?)?(?:\(?\d{3}\)?[\s.-]?)\d{3}[\s.-]?\d{4}/)?.[0] || '';
}

function inferNameFromFreeform(text: string, email?: string) {
  const cleaned = text.replace(email || '', '').replace(/[—–-].*$/, '').trim();
  const direct = cleaned.match(/\b(?:met|add|remember|capture|follow up with|thank)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+){0,3})\b/);
  if (direct?.[1]) return direct[1].trim();
  const lead = cleaned.match(/^([A-Z][a-z]+(?:\s+[A-Z][a-z]+){1,3})(?:\b|\s+[—–-])/);
  if (lead?.[1]) return lead[1].trim();
  return '';
}

function inferCompanyFromFreeform(text: string) {
  const at = text.match(/\b(?:at|from|with)\s+([A-Z][A-Za-z0-9&.' ]{2,80})(?:[.,;]|\s+[—–-]|$)/);
  if (at?.[1]) return at[1].trim();
  return '';
}
