import { appendRecord, readTab, type RuntimeEnv } from './sheets';

function clean(value: unknown, max = 1000) {
  const text = String(value ?? '').replace(/\s+/g, ' ').trim();
  return text.length > max ? `${text.slice(0, max - 1).trim()}…` : text;
}
function email(value: unknown) { return clean(value, 220).toLowerCase(); }
function slugId(prefix: string) { return `${prefix}_${Date.now()}_${crypto.randomUUID().slice(0, 8)}`; }
function personType(value: unknown, fallback = 'general_tech_adjacent') {
  const text = clean(value, 80).toLowerCase();
  if (text === 'general') return 'general_tech_adjacent';
  return ['investor', 'founder', 'operator', 'lawyer', 'service_provider', 'media', 'general_tech_adjacent', 'unknown'].includes(text) ? text : fallback;
}

export interface NetworkProfileInput {
  name?: unknown;
  email?: unknown;
  company?: unknown;
  website?: unknown;
  personType?: unknown;
  source?: unknown;
  captureType?: unknown;
  contextSummary?: unknown;
  tags?: unknown;
}

export async function ensureSelfSubmittedNetworkProfile(env: RuntimeEnv, input: NetworkProfileInput) {
  const normalizedEmail = email(input.email);
  const normalizedName = clean(input.name, 180);
  const now = new Date().toISOString();
  if (!normalizedEmail) return { ok: false, profile_id: '', profile_created: false, database_write_status: 'failed', reason: 'email_required' };
  const contacts = await readTab(env, 'contacts');
  const existing = contacts.find((row) => email(row.email) === normalizedEmail);
  if (existing) {
    const profileId = String(existing.contact_id || slugId('profile'));
    const updateRow = {
      ...existing,
      contact_id: profileId,
      created_at: clean(existing.created_at) || now,
      updated_at: now,
      status: clean(existing.status || 'active') || 'active',
      full_name: normalizedName || clean(existing.full_name || existing.name) || normalizedEmail,
      email: normalizedEmail,
      company: clean(input.company, 180) || clean(existing.company, 180),
      person_type: personType(input.personType || existing.person_type),
      deal_flow_prospect: clean(existing.deal_flow_prospect || 'unknown', 80) || 'unknown',
      relationship_type: clean(input.source || existing.relationship_type || 'self_submitted', 120),
      relationship_owner: clean(existing.relationship_owner || 'Unassigned', 120) || 'Unassigned',
      priority: clean(existing.priority || 'Normal', 80) || 'Normal',
      tags: mergeTags(existing.tags, input.tags || `${clean(input.source || 'network_os')},${clean(input.captureType || 'self_submission')}`),
      context_summary: mergeContext(existing.context_summary, input.contextSummary || `Self-submitted ${clean(input.captureType || 'profile')} update.`),
      founder_relevance: clean(input.captureType || existing.founder_relevance || '', 240),
      touch_needed: clean(existing.touch_needed || 'false', 20) || 'false',
      touch_status: clean(existing.touch_status || 'skipped', 80) || 'skipped',
      created_by: clean(existing.created_by || 'network_os_self_submission', 120),
      updated_by: 'network_os_self_submission'
    };
    await appendRecord(env, 'contacts', updateRow);
    return {
      ok: true,
      profile_id: profileId,
      profile_created: false,
      database_write_status: 'updated_existing',
      matched_by: 'email'
    };
  }
  const profileId = slugId('profile');
  const contact = {
    contact_id: profileId,
    created_at: now,
    updated_at: now,
    status: 'active',
    full_name: normalizedName || normalizedEmail,
    email: normalizedEmail,
    company: clean(input.company, 180),
    person_type: personType(input.personType || 'founder', 'founder'),
    deal_flow_prospect: 'unknown',
    relationship_type: clean(input.source || 'self_submitted', 120),
    relationship_owner: 'Unassigned',
    priority: 'Normal',
    tags: clean(input.tags || `${clean(input.source || 'network_os')},${clean(input.captureType || 'self_submission')}`, 400),
    context_summary: clean(input.contextSummary || 'Self-submitted Network OS profile.', 1000),
    dealflow_relevance: '',
    founder_relevance: clean(input.captureType || '', 240),
    touch_needed: 'false',
    touch_status: 'skipped',
    created_by: 'network_os_self_submission',
    updated_by: 'network_os_self_submission'
  };
  await appendRecord(env, 'contacts', contact);
  return { ok: true, profile_id: profileId, profile_created: true, database_write_status: 'created_new_profile', matched_by: '' };
}

function mergeTags(existing: unknown, incoming: unknown) {
  const values = new Set<string>();
  for (const source of [existing, incoming]) {
    for (const part of String(source ?? '').split(',')) {
      const tag = clean(part, 80);
      if (tag) values.add(tag);
    }
  }
  return Array.from(values).slice(0, 20).join(',');
}

function mergeContext(existing: unknown, incoming: unknown) {
  const current = clean(existing, 800);
  const next = clean(incoming, 800);
  if (!current) return next || 'Self-submitted Network OS profile update.';
  if (!next || current.includes(next)) return current;
  return clean(`${current} | Latest self-submitted update: ${next}`, 1000);
}
