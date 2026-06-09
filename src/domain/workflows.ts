import type { ApprovalRecord, ContactRecord, IntakeRecord, NotificationRecord, Owner, Priority, RelationshipTouch, TouchMethod } from './types';
import { ALL_GMAIL_TRIGGERS, containsWestPeekTrigger, detectSourceTrigger, detectTriggerIntent } from './triggers';
import { createStableId } from './ids';

export interface ParsedCapture {
  hasTrigger: boolean;
  trigger?: string;
  sourceTrigger?: string;
  triggerIntent: 'network' | 'deal_flow';
  personType: 'investor' | 'founder' | 'operator' | 'lawyer' | 'service_provider' | 'media' | 'general' | 'unknown';
  dealFlowProspect: 'yes' | 'no' | 'unknown';
  dealContext?: string;
  name?: string;
  company?: string;
  context?: string;
  owner: Owner;
  needsTouch: boolean;
  touchMethod: TouchMethod;
  priority: Priority;
  dueDate?: string;
  rawText: string;
}

const ownerMap: Record<string, Owner> = {
  sequoia: 'Sequoia',
  scooter: 'Scooter',
  unassigned: 'Unassigned'
};
const priorityMap: Record<string, Priority> = {
  low: 'Low',
  normal: 'Normal',
  high: 'High'
};
const touchMap: Record<string, TouchMethod> = {
  undecided: 'undecided',
  email: 'email',
  'handwritten note': 'handwritten_note',
  handwritten_note: 'handwritten_note',
  handwritten: 'handwritten_note',
  gift: 'gift',
  intro: 'intro',
  'intro follow-up': 'intro',
  call: 'call',
  meeting: 'meeting',
  'event invite': 'event_invite',
  event_invite: 'event_invite',
  other: 'other'
};

export function parseWestPeekCapture(rawText: string): ParsedCapture {
  const trigger = detectSourceTrigger(rawText);
  const fields = parseKeyValueLines(rawText);
  const triggerIntent = detectTriggerIntent(rawText);
  const personType = classifyPersonType(rawText, triggerIntent);
  const dealFlowProspect = triggerIntent === 'deal_flow' ? 'yes' : 'unknown';
  const dealContext = triggerIntent === 'deal_flow' ? buildDealContext(rawText) : '';
  const context = fields.context || fields.notes || fields.note || inferContext(rawText);
  const owner = ownerMap[(fields.owner || '').trim().toLowerCase()] || inferOwner(rawText);
  const touchValue = (fields.touch || fields['type of touch'] || fields.method || '').trim().toLowerCase();
  const priority = priorityMap[(fields.priority || '').trim().toLowerCase()] || inferPriority(rawText);
  return {
    hasTrigger: containsWestPeekTrigger(rawText),
    trigger,
    sourceTrigger: trigger,
    triggerIntent,
    personType,
    dealFlowProspect,
    dealContext,
    name: fields.name || inferName(rawText),
    company: fields.company,
    context,
    owner,
    needsTouch: /^yes|true|required/i.test(fields['needs touch'] || '') || /touch|thank-?you|follow up|follow-up/i.test(rawText),
    touchMethod: touchMap[touchValue] || inferTouch(rawText),
    priority,
    dueDate: fields.due || fields['due date'],
    rawText
  };
}

export function buildIntakeFromCapture(rawText: string, capturedBy: string): IntakeRecord {
  const parsed = parseWestPeekCapture(rawText);
  const now = new Date().toISOString();
  return {
    intake_id: createStableId('intake'),
    created_at: now,
    updated_at: now,
    source: 'gmail_trigger',
    captured_by: capturedBy,
    source_user_email: capturedBy,
    raw_text: rawText,
    parsed_name: parsed.name,
    parsed_company: parsed.company || inferCompanyFromDeal(rawText),
    parsed_email: extractEmail(rawText),
    parsed_notes: parsed.triggerIntent === 'deal_flow' ? `Founder / prospective deal flow. ${parsed.context || 'Review founder and company context.'}` : parsed.context,
    ai_summary: parsed.triggerIntent === 'deal_flow' ? `Founder / prospective deal flow. ${parsed.context || ''}${parsed.dealContext ? ` Deal context: ${parsed.dealContext}` : ''}`.trim() : parsed.context || 'Captured for West Peek Network review.',
    source_trigger: parsed.sourceTrigger,
    trigger_intent: parsed.triggerIntent,
    person_type: parsed.personType,
    deal_flow_prospect: parsed.dealFlowProspect,
    deal_context: parsed.dealContext,
    ai_confidence: parsed.name || parsed.context ? 'medium' : 'low',
    review_status: 'ai_reviewed'
  };
}

export function convertIntakeToContact(intake: IntakeRecord, owner: Owner = 'Unassigned'): ContactRecord {
  const parsed = parseWestPeekCapture(intake.raw_text);
  const now = new Date().toISOString();
  return {
    contact_id: createStableId('contact'),
    created_at: now,
    updated_at: now,
    status: 'active',
    full_name: intake.parsed_name || parsed.name || 'Unparsed Contact',
    email: intake.parsed_email,
    company: intake.parsed_company || parsed.company,
    person_type: intake.person_type || parsed.personType,
    deal_flow_prospect: intake.deal_flow_prospect || parsed.dealFlowProspect,
    relationship_type: (intake.person_type || parsed.personType) === 'founder' ? 'Founder' : undefined,
    relationship_owner: parsed.owner === 'Unassigned' ? owner : parsed.owner,
    priority: parsed.priority,
    tags: buildTags(intake, parsed),
    context_summary: buildContactSummary(intake, parsed),
    dealflow_relevance: (intake.deal_flow_prospect || parsed.dealFlowProspect) === 'yes' ? String(intake.deal_context || intake.ai_summary || 'Prospective deal flow') : undefined,
    founder_relevance: (intake.person_type || parsed.personType) === 'founder' ? String(intake.deal_context || intake.ai_summary || 'Founder relationship') : undefined,
    touch_needed: parsed.needsTouch,
    touch_status: parsed.needsTouch ? 'needed' : undefined,
    created_by: intake.captured_by,
    updated_by: intake.captured_by
  };
}

export function findDuplicateContact(candidate: Pick<ContactRecord, 'email' | 'full_name' | 'company'>, contacts: ContactRecord[]): ContactRecord | undefined {
  const email = candidate.email?.trim().toLowerCase();
  if (email) {
    const exactEmail = contacts.find((contact) => contact.email?.trim().toLowerCase() === email);
    if (exactEmail) return exactEmail;
  }
  const name = normalize(candidate.full_name);
  const company = normalize(candidate.company || '');
  if (!name) return undefined;
  return contacts.find((contact) => normalize(contact.full_name) === name && normalize(contact.company || '') === company);
}

export function createTouchForContact(contact: ContactRecord, method: TouchMethod, reason: string, priority: Priority, dueDate: string): RelationshipTouch {
  const now = new Date().toISOString();
  return {
    touch_id: createStableId('touch'),
    contact_id: contact.contact_id,
    created_at: now,
    updated_at: now,
    owner: contact.relationship_owner,
    reason,
    priority,
    due_date: dueDate || 'This week',
    status: method === 'undecided' ? 'needed' : 'planned',
    method,
    created_by: contact.created_by,
    updated_by: contact.updated_by
  };
}

export function createApprovalForTouch(touch: RelationshipTouch, contact: ContactRecord): ApprovalRecord {
  const now = new Date().toISOString();
  const highRiskMethods = new Set<TouchMethod>(['gift', 'handwritten_note', 'virtual_thank_you_card']);
  return {
    approval_id: createStableId('approval'),
    created_at: now,
    updated_at: now,
    approval_type: touch.method === 'gift' ? 'gift' : touch.method === 'handwritten_note' ? 'handwritten_note' : touch.method === 'virtual_thank_you_card' ? 'virtual_thank_you_card' : 'relationship_touch',
    source_entity_type: 'relationship_touch',
    source_entity_id: touch.touch_id,
    requested_by: contact.created_by,
    assigned_to: contact.relationship_owner,
    relationship_owner: contact.relationship_owner,
    status: 'pending',
    risk_level: highRiskMethods.has(touch.method) ? 'medium' : 'low',
    suggested_payload: `${touch.method} touch for ${contact.full_name}: ${touch.reason}`,
    last_notified_at: now,
    escalation_level: '0'
  };
}

export function createNotificationForApproval(approval: ApprovalRecord, recipientEmail: string): NotificationRecord {
  const now = new Date().toISOString();
  return {
    notification_id: createStableId('notification'),
    created_at: now,
    updated_at: now,
    recipient_email: recipientEmail,
    notification_type: approval.risk_level === 'high' ? 'high_priority_approval' : 'approval_waiting',
    channel: 'in_app',
    subject: `Approval needed: ${approval.approval_type}`,
    body_preview: approval.suggested_payload,
    entity_type: 'approval',
    entity_id: approval.approval_id,
    priority: approval.risk_level === 'high' ? 'High' : 'Normal',
    status: 'unread'
  };
}

export function approveRecord<T extends ApprovalRecord>(approval: T, approvedBy: string): T {
  const now = new Date().toISOString();
  return { ...approval, status: 'approved', approved_by: approvedBy, approved_at: now, updated_at: now };
}

export function rejectRecord<T extends ApprovalRecord>(approval: T, rejectedBy: string): T {
  const now = new Date().toISOString();
  return { ...approval, status: 'rejected', rejected_by: rejectedBy, rejected_at: now, updated_at: now };
}

function parseKeyValueLines(text: string): Record<string, string> {
  const result: Record<string, string> = {};
  for (const line of text.split(/\r?\n/)) {
    const match = line.match(/^\s*([^:#]+):\s*(.+?)\s*$/);
    if (!match) continue;
    result[match[1].trim().toLowerCase()] = match[2].trim();
  }
  return result;
}

function inferContext(text: string): string | undefined {
  const cleaned = text.split(/\r?\n/).map((line) => line.trim()).filter(Boolean).filter((line) => !ALL_GMAIL_TRIGGERS.includes(line.toLowerCase() as typeof ALL_GMAIL_TRIGGERS[number])).join(' ');
  return cleaned || undefined;
}

function inferName(text: string): string | undefined {
  const match = text.match(/\b(?:Met|Add|Name)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+){0,2})\b/);
  return match?.[1];
}

function inferOwner(text: string): Owner {
  const lower = text.toLowerCase();
  if (lower.includes('scooter')) return 'Scooter';
  if (lower.includes('sequoia')) return 'Sequoia';
  return 'Unassigned';
}

function inferPriority(text: string): Priority {
  if (/high|this week|valuable|urgent/i.test(text)) return 'High';
  if (/low/i.test(text)) return 'Low';
  return 'Normal';
}

function inferTouch(text: string): TouchMethod {
  const lower = text.toLowerCase();
  if (lower.includes('virtual thank')) return 'virtual_thank_you_card';
  if (lower.includes('thank') && lower.includes('card')) return 'virtual_thank_you_card';
  if (lower.includes('handwritten')) return 'handwritten_note';
  if (lower.includes('gift')) return 'gift';
  if (lower.includes('intro')) return 'intro';
  if (lower.includes('call')) return 'call';
  if (lower.includes('meeting')) return 'meeting';
  if (lower.includes('event invite')) return 'event_invite';
  if (lower.includes('email')) return 'email';
  return 'undecided';
}

function normalize(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, ' ');
}

function extractEmail(text: string): string | undefined {
  return text.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i)?.[0];
}


function classifyPersonType(text: string, triggerIntent: 'network' | 'deal_flow') {
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

function inferCompanyFromDeal(text: string) {
  const blurb = text.match(/\b([A-Z][A-Za-z0-9]+)\s+is\s+building\b/);
  if (blurb?.[1]) return blurb[1].trim();
  const email = extractEmail(text);
  const domain = email?.split('@')[1] || '';
  if (domain && !/gmail|yahoo|outlook|icloud|hotmail/i.test(domain)) return domain.split('.')[0].replace(/\b\w/g, (char) => char.toUpperCase());
  return undefined;
}

function buildTags(intake: IntakeRecord, parsed: ParsedCapture) {
  const tags = new Set<string>();
  if (parsed.needsTouch) tags.add('Needs touch');
  if ((intake.person_type || parsed.personType) === 'founder') tags.add('Founder');
  if ((intake.deal_flow_prospect || parsed.dealFlowProspect) === 'yes') tags.add('Prospective Deal Flow');
  return Array.from(tags);
}

function buildContactSummary(intake: IntakeRecord, parsed: ParsedCapture) {
  return [
    (intake.deal_flow_prospect || parsed.dealFlowProspect) === 'yes' ? 'Founder / prospective deal flow.' : '',
    intake.ai_summary || intake.parsed_notes || parsed.context || 'Captured for West Peek Network review.',
    intake.deal_context ? `Deal context: ${intake.deal_context}` : ''
  ].filter(Boolean).join(' ');
}
