export type GmailTarget = {
  name: string;
  email: string;
  company: string;
  source: 'structured' | 'quoted_from' | 'envelope' | 'named_body' | 'body_email' | 'none';
};

type TargetInput = {
  headers: Record<string, string>;
  bodyText: string;
  userEmail?: string;
  mailboxEmail?: string;
  structuredName?: string;
  structuredEmail?: string;
  structuredCompany?: string;
};

type Candidate = { name: string; email: string; source: GmailTarget['source'] };

export function normalizeGmailText(value: string, options: { stripQuoted?: boolean; html?: boolean } = {}) {
  const stripQuoted = options.stripQuoted === true;
  const html = options.html === true;
  let normalized = String(value || '').replace(/\r\n?/g, '\n');
  if (html) {
    normalized = normalized
      .replace(/<style[\s\S]*?<\/style>/gi, ' ')
      .replace(/<script[\s\S]*?<\/script>/gi, ' ')
      .replace(/<br\s*\/?\s*>/gi, '\n')
      .replace(/<\/p\s*>/gi, '\n')
      .replace(/<\/div\s*>/gi, '\n')
      .replace(/<[^>]+>/g, ' ');
  }
  return normalized
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(stripQuoted ? /(?:On .+? wrote:|-{2,}\s*Forwarded message\s*-{2,}|From:.+?Sent:.+?To:.+?Subject:)[\s\S]*$/i : /$^/, '')
    .replace(/[ \t]+/g, ' ')
    .replace(/ *\n */g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

export function combineGmailTextParts(input: { plain: string[]; html: string[]; snippet?: string }) {
  const plain = uniqueSegments(input.plain.map((value) => normalizeGmailText(value)));
  const html = uniqueSegments(input.html.map((value) => normalizeGmailText(value, { html: true })));
  const selected = uniqueSegments([...plain, ...html]);
  if (!selected.length) selected.push(...uniqueSegments([normalizeGmailText(input.snippet || '')]));
  const fullText = selected.join('\n\n').trim();
  const visibleText = normalizeGmailText(selected[0] || input.snippet || '', { stripQuoted: true });
  return { fullText, visibleText };
}

const INTERNAL_ADDRESSES = new Set([
  'sequoia@westpeek.ventures',
  'scooter@westpeek.ventures',
  'info@westpeek.ventures'
]);
const FREE_EMAIL_DOMAINS = /^(gmail|yahoo|outlook|icloud|hotmail|aol|protonmail|proton|live|msn)\./i;

export function resolveGmailTarget(input: TargetInput): GmailTarget {
  const excluded = new Set<string>([
    ...INTERNAL_ADDRESSES,
    cleanEmail(input.userEmail),
    cleanEmail(input.mailboxEmail)
  ].filter(Boolean));

  const structuredEmail = cleanEmail(input.structuredEmail);
  const candidates: Candidate[] = [];
  if (structuredEmail && !isInternal(structuredEmail, excluded)) {
    candidates.push({ name: cleanName(input.structuredName), email: structuredEmail, source: 'structured' });
  }

  for (const line of input.bodyText.split(/\r?\n/)) {
    const match = line.match(/^\s*>*\s*(?:from|reply-to|sender)\s*:\s*(.+?)\s*$/i);
    if (!match) continue;
    for (const mailbox of parseMailboxList(match[1])) {
      if (!isInternal(mailbox.email, excluded)) candidates.push({ ...mailbox, source: 'quoted_from' });
    }
  }

  for (const headerName of ['reply-to', 'from', 'to', 'cc']) {
    for (const mailbox of parseMailboxList(input.headers[headerName] || '')) {
      if (!isInternal(mailbox.email, excluded)) candidates.push({ ...mailbox, source: 'envelope' });
    }
  }

  const namedPattern = /(?:^|[\s(,;])([^\n<>,;]{1,100}?)\s*<([A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,})>/gi;
  for (const match of input.bodyText.matchAll(namedPattern)) {
    const email = cleanEmail(match[2]);
    if (!isInternal(email, excluded)) candidates.push({ name: cleanName(match[1]), email, source: 'named_body' });
  }

  const bodyEmails = input.bodyText.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi) || [];
  for (const value of bodyEmails) {
    const email = cleanEmail(value);
    if (!isInternal(email, excluded)) candidates.push({ name: '', email, source: 'body_email' });
  }

  const selected = dedupeCandidates(candidates)[0];
  if (!selected) return { name: '', email: '', company: cleanText(input.structuredCompany), source: 'none' };

  const company = cleanText(input.structuredCompany) || extractCompany(input.bodyText) || inferCompanyFromEmail(selected.email);
  const name = selected.name || ((structuredEmail === selected.email) ? cleanName(input.structuredName) : '') || extractNameNearEmail(input.bodyText, selected.email);
  return { name, email: selected.email, company, source: selected.source };
}

export function isWestPeekInternalEmail(value: unknown) {
  const email = cleanEmail(value);
  return Boolean(email && (INTERNAL_ADDRESSES.has(email) || email.endsWith('@westpeek.ventures')));
}

function isInternal(email: string, excluded: Set<string>) {
  return !email || excluded.has(email) || email.endsWith('@westpeek.ventures');
}

function parseMailboxList(value: string) {
  const output: Array<{ name: string; email: string }> = [];
  const anglePattern = /(?:^|,)\s*([^,<]*?)\s*<([A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,})>/gi;
  for (const match of value.matchAll(anglePattern)) {
    output.push({ name: cleanName(match[1]), email: cleanEmail(match[2]) });
  }
  const captured = new Set(output.map((item) => item.email));
  const bare = value.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi) || [];
  for (const emailValue of bare) {
    const email = cleanEmail(emailValue);
    if (!captured.has(email)) output.push({ name: '', email });
  }
  return output.filter((item) => item.email);
}

function dedupeCandidates(candidates: Candidate[]) {
  const byEmail = new Map<string, Candidate>();
  for (const candidate of candidates) {
    const current = byEmail.get(candidate.email);
    if (!current || (!current.name && candidate.name)) byEmail.set(candidate.email, candidate);
  }
  return Array.from(byEmail.values());
}

function extractCompany(text: string) {
  const patterns = [
    /^\s*>*\s*(?:company|company name|startup|organization|organisation)\s*:\s*(.+?)\s*$/im,
    /\b(?:founder|co-founder|ceo)\s+(?:at|of)\s+([A-Z][A-Za-z0-9&.' -]{1,100})/i,
    /\b([A-Z][A-Za-z0-9&.'-]{1,80})\s+is\s+building\b/i
  ];
  for (const pattern of patterns) {
    const value = text.match(pattern)?.[1];
    if (value) return normalizeCompany(value);
  }
  return '';
}

function normalizeCompany(value: unknown) {
  return cleanText(value)
    .replace(/[|•].*$/, '')
    .split(/\.\s+(?=[A-Z])/)[0]
    .replace(/[.!?]+$/, '')
    .trim();
}

function extractNameNearEmail(text: string, email: string) {
  const escaped = email.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const fromLine = text.match(new RegExp(`^\\s*>*\\s*(?:from|reply-to|sender)\\s*:\\s*([^\\n<]{2,100})\\s*<${escaped}>`, 'im'))?.[1];
  if (fromLine) return cleanName(fromLine);
  return '';
}

function inferCompanyFromEmail(email: string) {
  const domain = email.split('@')[1]?.toLowerCase() || '';
  if (!domain || FREE_EMAIL_DOMAINS.test(domain)) return '';
  const root = domain.split('.')[0].replace(/[-_]+/g, ' ');
  return root.replace(/\b\w/g, (character) => character.toUpperCase());
}


function uniqueSegments(values: string[]) {
  const seen = new Set<string>();
  const output: string[] = [];
  for (const value of values) {
    const normalized = value.trim();
    if (!normalized || seen.has(normalized)) continue;
    seen.add(normalized);
    output.push(normalized);
  }
  return output;
}

function cleanEmail(value: unknown) {
  const normalized = String(value || '').trim().replace(/^mailto:/i, '');
  return (normalized.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i)?.[0] || '').toLowerCase();
}

function cleanName(value: unknown) {
  return cleanText(value)
    .replace(/^[-–—|•]+|[-–—|•]+$/g, '')
    .replace(/^"|"$/g, '')
    .replace(/^(?:from|reply-to|sender)\s*:\s*/i, '')
    .trim();
}

function cleanText(value: unknown) {
  return String(value || '').replace(/\s+/g, ' ').trim();
}
