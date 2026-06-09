export const canonicalTrigger = '#wpnetwork';
export const acceptedAliases = ['#addtowestpeek', '#westpeeknetwork'];
export const canonicalDealFlowTrigger = '#wpdealflow';
export const acceptedDealFlowAliases = ['#dealflow'];

export const networkTriggers = [canonicalTrigger, ...acceptedAliases];
export const dealFlowTriggers = [canonicalDealFlowTrigger, ...acceptedDealFlowAliases];
export const allTriggers = [...networkTriggers, ...dealFlowTriggers];

export type TriggerIntent = 'network' | 'deal_flow';
export type PersonType = 'investor' | 'founder' | 'operator' | 'lawyer' | 'service_provider' | 'media' | 'general' | 'unknown';
export type DealFlowProspect = 'yes' | 'no' | 'unknown';

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

export type TriggerClassification = {
  source_trigger: string;
  trigger_intent: TriggerIntent;
  person_type: PersonType;
  deal_flow_prospect: DealFlowProspect;
  deal_context: string;
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

export function detectSourceTrigger(text: string) {
  const lower = text.toLowerCase();
  return allTriggers.find((trigger) => lower.includes(trigger)) || '';
}

export function detectTriggerIntent(text: string): TriggerIntent {
  const trigger = detectSourceTrigger(text);
  return dealFlowTriggers.includes(trigger) ? 'deal_flow' : 'network';
}

export function classifyPersonType(text: string, triggerIntent: TriggerIntent): PersonType {
  if (triggerIntent === 'deal_flow') return 'founder';
  const lower = text.toLowerCase();
  if (/\b(founder|co-founder|ceo|startup|building)\b/.test(lower)) return 'founder';
  if (/\b(investor|fund|family office|lp|gp|capital)\b/.test(lower)) return 'investor';
  if (/\b(lawyer|attorney|counsel|legal)\b/.test(lower)) return 'lawyer';
  if (/\b(operator|operations|chief of staff)\b/.test(lower)) return 'operator';
  if (/\b(service provider|vendor|agency|consultant)\b/.test(lower)) return 'service_provider';
  if (/\b(media|journalist|press|podcast)\b/.test(lower)) return 'media';
  return 'unknown';
}

export function classifyTrigger(text: string): TriggerClassification {
  const sourceTrigger = detectSourceTrigger(text);
  const triggerIntent = detectTriggerIntent(text);
  const personType = classifyPersonType(text, triggerIntent);
  return {
    source_trigger: sourceTrigger,
    trigger_intent: triggerIntent,
    person_type: personType,
    deal_flow_prospect: triggerIntent === 'deal_flow' ? 'yes' : 'unknown',
    deal_context: triggerIntent === 'deal_flow' ? buildDealContext(text) : ''
  };
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
  return /thank\s*-?\s*you|handwritten|follow\s*-?\s*up|circle back|send|intro|touch|due|coffee|video call|meeting/i.test(text);
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
    .replace(/#wpnetwork|#addtowestpeek|#westpeeknetwork|#wpdealflow|#dealflow/gi, '')
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
  const direct = cleaned.match(/\b(?:met|add|remember|capture|follow up with|thank|from)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+){0,3})\b/);
  if (direct?.[1]) return direct[1].trim();
  const lead = cleaned.match(/^([A-Z][a-z]+(?:\s+[A-Z][a-z]+){1,3})(?:\b|\s+[—–-])/);
  if (lead?.[1]) return lead[1].trim();
  return '';
}

function inferCompanyFromFreeform(text: string) {
  const at = text.match(/\b(?:at|from|with)\s+([A-Z][A-Za-z0-9&.' ]{2,80})(?:[.,;]|\s+[—–-]|$)/);
  if (at?.[1]) return at[1].trim();
  const blurb = text.match(/\b([A-Z][A-Za-z0-9]+)\s+is\s+building\b/);
  if (blurb?.[1]) return blurb[1].trim();
  const email = extractEmail(text);
  const domain = email.split('@')[1] || '';
  if (domain && !/gmail|yahoo|outlook|icloud|hotmail/i.test(domain)) return domain.split('.')[0].replace(/\b\w/g, (char) => char.toUpperCase());
  return '';
}

function buildDealContext(text: string) {
  const parts = [
    text.match(/\b[A-Z][A-Za-z0-9]+ is building[^\n]+/i)?.[0],
    text.match(/Traction:\s*([^\n]+)/i)?.[0],
    text.match(/Team:\s*([^\n]+)/i)?.[0],
    text.match(/Raise:\s*([^\n]+)/i)?.[0],
    text.match(/Deck:\s*(https?:\/\/[^\s)]+)/i)?.[0],
    text.match(/(?:coffee|video call|quick call|meeting)[^.?\n]*(?:[.?\n]|$)/i)?.[0]?.trim(),
    text.match(/\bPitch\s*&\s*Drink\b/i)?.[0],
    text.match(/\bNY Tech Week\b/i)?.[0]
  ].filter(Boolean).map((item) => String(item).trim());
  return Array.from(new Set(parts)).join(' | ');
}
