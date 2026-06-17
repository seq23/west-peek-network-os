import type { AiSuggestionRecord, ApprovalRecord, ContactRecord, EventAttendeeRecord, EventRecord, IntakeRecord, NotificationRecord, RelationshipTouch, TouchMethod } from '../domain/types';

export type SheetSnapshot = {
  source?: string;
  refreshedAt?: string;
  freshnessRequested?: boolean;
  cacheAgeMs?: number;
  contacts: ContactRecord[];
  intake: IntakeRecord[];
  touches: RelationshipTouch[];
  approvals: ApprovalRecord[];
  notifications: NotificationRecord[];
  aiSuggestions: AiSuggestionRecord[];
  events: EventRecord[];
  eventAttendees: EventAttendeeRecord[];
};

export type CreateEventInput = { event_name: string; event_date?: string; location?: string; notes?: string; owner_email?: string; public_form_enabled?: boolean };
export type AddEventContextInput = { event_id: string; public_name?: string; public_email?: string; public_company?: string; public_title?: string; private_context?: string; source_type?: string };

export async function fetchSheetSnapshot(options: { fresh?: boolean } = {}): Promise<SheetSnapshot> {
  const url = options.fresh ? '/api/sheets/snapshot?fresh=1' : '/api/sheets/snapshot';
  const payload = await requestJson<{ data?: Record<string, unknown[]>; source?: string; refreshed_at?: string; freshness_requested?: boolean; cache_age_ms?: number }>(url, {
    cache: 'no-store'
  });
  const data = payload.data || {};
  return {
    source: payload.source,
    refreshedAt: payload.refreshed_at,
    freshnessRequested: payload.freshness_requested,
    cacheAgeMs: payload.cache_age_ms,
    contacts: rows(data.contacts).map(normalizeContact),
    intake: rows(data.intake_queue).map(normalizeIntake),
    touches: rows(data.relationship_touches).map(normalizeTouch),
    approvals: rows(data.approvals).map(normalizeApproval),
    notifications: rows(data.notifications).map(normalizeNotification),
    aiSuggestions: rows(data.ai_suggestions).map(normalizeAiSuggestion),
    events: rows(data.events).map(normalizeEvent),
    eventAttendees: rows(data.event_attendees).map(normalizeEventAttendee)
  };
}

export async function createSheetContact(contact: ContactRecord, touchMethod: TouchMethod) {
  return requestJson('/api/contacts/create', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ ...contact, tags: contact.tags, touch_method: touchMethod })
  });
}

export async function createSheetIntake(rawText: string) {
  return requestJson('/api/intake/create', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ raw_text: rawText })
  });
}

export async function createSheetEvent(input: CreateEventInput) {
  return requestJson<{ ok: boolean; event: EventRecord; public_form_url: string }>('/api/events/create', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(input)
  });
}

export async function createSheetEventContext(input: AddEventContextInput) {
  return requestJson('/api/events/context/create', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(input)
  });
}

export async function reviewSheetIntake(intakeId: string, action: 'convert' | 'attach' | 'dismiss', extra: Record<string, unknown> = {}) {
  return requestJson('/api/intake/review', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ intake_id: intakeId, action, ...extra })
  });
}

export async function decideSheetApproval(approvalId: string, decision: 'approve' | 'reject') {
  return requestJson('/api/approvals/decision', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ approval_id: approvalId, decision })
  });
}

export async function updateSheetTouchFulfillment(touch: RelationshipTouch, update: Partial<RelationshipTouch>) {
  return requestJson('/api/touches/fulfillment/update', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ ...touch, ...update })
  });
}

export async function markSheetNotificationRead(notificationId: string, recipientEmail = '') {
  return requestJson('/api/notifications/read', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ notification_id: notificationId, recipient_email: recipientEmail })
  });
}

export async function updateSheetContactStatus(contactId: string, status: 'active' | 'archived', reason = '') {
  return requestJson('/api/contacts/status', {
    method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ contact_id: contactId, status, reason })
  });
}

export async function updateSheetEventStatus(eventId: string, action: 'revoke' | 'restore') {
  return requestJson('/api/events/status', {
    method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ event_id: eventId, action })
  });
}


export async function updateSheetRecordLifecycle(entity: 'intake' | 'touch' | 'approval' | 'notification' | 'ai_suggestion' | 'event_attendee', id: string, action: 'archive' | 'restore', reason = '') {
  return requestJson('/api/records/lifecycle', {
    method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ entity, id, action, reason })
  });
}

async function requestJson<T = Record<string, unknown>>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, { credentials: 'same-origin', ...(init || {}) });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok || payload?.ok === false) throw new Error(payload?.error || `${url} failed with ${response.status}`);
  return payload as T;
}

function rows(value: unknown) { return Array.isArray(value) ? value as Array<Record<string, unknown>> : []; }

function normalizeContact(row: Record<string, unknown>): ContactRecord {
  return {
    contact_id: str(row.contact_id),
    created_at: str(row.created_at),
    updated_at: str(row.updated_at),
    status: str(row.status, 'active') as 'active' | 'archived',
    full_name: str(row.full_name, 'Unnamed contact'),
    email: emptyToUndefined(row.email),
    company: emptyToUndefined(row.company),
    person_type: emptyToUndefined(row.person_type) as ContactRecord['person_type'],
    deal_flow_prospect: emptyToUndefined(row.deal_flow_prospect) as ContactRecord['deal_flow_prospect'],
    relationship_type: emptyToUndefined(row.relationship_type),
    relationship_owner: owner(row.relationship_owner),
    priority: priority(row.priority),
    tags: split(row.tags),
    context_summary: str(row.context_summary, 'No context yet.'),
    dealflow_relevance: emptyToUndefined(row.dealflow_relevance),
    founder_relevance: emptyToUndefined(row.founder_relevance),
    touch_needed: bool(row.touch_needed),
    touch_status: emptyToUndefined(row.touch_status) as ContactRecord['touch_status'],
    created_by: str(row.created_by, 'google_sheets'),
    updated_by: str(row.updated_by, 'google_sheets')
  };
}

function normalizeIntake(row: Record<string, unknown>): IntakeRecord {
  return {
    intake_id: str(row.intake_id), created_at: str(row.created_at), updated_at: str(row.updated_at), source: str(row.source, 'manual_note') as IntakeRecord['source'], capture_type: emptyToUndefined(row.capture_type) as IntakeRecord['capture_type'],
    captured_by: str(row.captured_by, 'unknown'), source_user_email: emptyToUndefined(row.source_user_email), gmail_message_id: emptyToUndefined(row.gmail_message_id), gmail_thread_id: emptyToUndefined(row.gmail_thread_id), gmail_rfc_message_id: emptyToUndefined(row.gmail_rfc_message_id), gmail_ingestion_key: emptyToUndefined(row.gmail_ingestion_key), source_mailbox: emptyToUndefined(row.source_mailbox), source_trigger: emptyToUndefined(row.source_trigger), trigger_intent: emptyToUndefined(row.trigger_intent) as IntakeRecord['trigger_intent'], person_type: emptyToUndefined(row.person_type) as IntakeRecord['person_type'], deal_flow_prospect: emptyToUndefined(row.deal_flow_prospect) as IntakeRecord['deal_flow_prospect'], deal_context: emptyToUndefined(row.deal_context), raw_text: str(row.raw_text),
    email_subject: emptyToUndefined(row.email_subject), email_from: emptyToUndefined(row.email_from), email_to: emptyToUndefined(row.email_to), email_date: emptyToUndefined(row.email_date),
    parsed_name: emptyToUndefined(row.parsed_name), parsed_email: emptyToUndefined(row.parsed_email), parsed_phone: emptyToUndefined(row.parsed_phone), parsed_company: emptyToUndefined(row.parsed_company), parsed_title: emptyToUndefined(row.parsed_title), parsed_website: emptyToUndefined(row.parsed_website), parsed_notes: emptyToUndefined(row.parsed_notes), parsed_owner: owner(row.parsed_owner), parsed_touch: emptyToUndefined(row.parsed_touch) as IntakeRecord['parsed_touch'], parsed_priority: priority(row.parsed_priority), parsed_due: emptyToUndefined(row.parsed_due), parsed_needs_touch: bool(row.parsed_needs_touch),
    event_id: emptyToUndefined(row.event_id), event_name: emptyToUndefined(row.event_name), event_slug: emptyToUndefined(row.event_slug),
    source_file_name: emptyToUndefined(row.source_file_name), source_file_type: emptyToUndefined(row.source_file_type), extracted_text: emptyToUndefined(row.extracted_text), transcript_text: emptyToUndefined(row.transcript_text), missing_fields: emptyToUndefined(row.missing_fields), ai_summary: emptyToUndefined(row.ai_summary), ai_confidence: confidence(row.ai_confidence), internal_data_trace: emptyToUndefined(row.internal_data_trace),
    human_review_required: bool(row.human_review_required), execution_allowed: bool(row.execution_allowed), review_status: reviewStatus(row.review_status), reviewed_by: emptyToUndefined(row.reviewed_by), reviewed_at: emptyToUndefined(row.reviewed_at), converted_contact_id: emptyToUndefined(row.converted_contact_id), attached_contact_id: emptyToUndefined(row.attached_contact_id), dismiss_reason: emptyToUndefined(row.dismiss_reason)
  };
}

function normalizeTouch(row: Record<string, unknown>): RelationshipTouch {
  return {
    touch_id: str(row.touch_id), contact_id: str(row.contact_id), created_at: str(row.created_at), updated_at: str(row.updated_at), owner: owner(row.owner), reason: str(row.reason, 'Relationship touch'), priority: priority(row.priority), due_date: str(row.due_date, 'This week'), status: str(row.status, 'pending_approval') as RelationshipTouch['status'], method: str(row.method, 'undecided') as RelationshipTouch['method'], contact_email: emptyToUndefined(row.contact_email), recipient_name: emptyToUndefined(row.recipient_name), recipient_email: emptyToUndefined(row.recipient_email), company: emptyToUndefined(row.company), card_type: emptyToUndefined(row.card_type), card_title: emptyToUndefined(row.card_title), email_subject: emptyToUndefined(row.email_subject), email_body: emptyToUndefined(row.email_body), draft_message: emptyToUndefined(row.draft_message), approval_required: bool(row.approval_required), execution_allowed: bool(row.execution_allowed), internal_data_trace: emptyToUndefined(row.internal_data_trace), created_by: emptyToUndefined(row.created_by), updated_by: emptyToUndefined(row.updated_by), fulfillment_mode: emptyToUndefined(row.fulfillment_mode) as RelationshipTouch['fulfillment_mode'], fulfillment_status: emptyToUndefined(row.fulfillment_status), vendor_name: emptyToUndefined(row.vendor_name), vendor_url: emptyToUndefined(row.vendor_url), vendor_fit: emptyToUndefined(row.vendor_fit), vendor_note: emptyToUndefined(row.vendor_note), external_order_id: emptyToUndefined(row.external_order_id), sent_at: emptyToUndefined(row.sent_at), fulfillment_notes: emptyToUndefined(row.fulfillment_notes)
  };
}

function normalizeApproval(row: Record<string, unknown>): ApprovalRecord {
  return { approval_id: str(row.approval_id), created_at: str(row.created_at), updated_at: str(row.updated_at), approval_type: str(row.approval_type), source_entity_type: emptyToUndefined(row.source_entity_type), source_entity_id: emptyToUndefined(row.source_entity_id), requested_by: emptyToUndefined(row.requested_by), assigned_to: owner(row.assigned_to), relationship_owner: owner(row.relationship_owner), status: str(row.status, 'pending') as ApprovalRecord['status'], risk_level: str(row.risk_level, 'medium') as ApprovalRecord['risk_level'], suggested_payload: str(row.suggested_payload), approved_by: emptyToUndefined(row.approved_by), approved_at: emptyToUndefined(row.approved_at), rejected_by: emptyToUndefined(row.rejected_by), rejected_at: emptyToUndefined(row.rejected_at) };
}


function normalizeAiSuggestion(row: Record<string, unknown>): AiSuggestionRecord {
  return { suggestion_id: str(row.suggestion_id), created_at: str(row.created_at), updated_at: str(row.updated_at), suggestion_type: str(row.suggestion_type, 'follow_up_recommendation') as AiSuggestionRecord['suggestion_type'], source_entity_type: str(row.source_entity_type), source_entity_id: str(row.source_entity_id), confidence: confidence(row.confidence), status: str(row.status, 'pending') as AiSuggestionRecord['status'], suggested_payload: str(row.suggested_payload), reasoning_summary: str(row.reasoning_summary), reviewed_by: emptyToUndefined(row.reviewed_by), reviewed_at: emptyToUndefined(row.reviewed_at), applied_entity_type: emptyToUndefined(row.applied_entity_type), applied_entity_id: emptyToUndefined(row.applied_entity_id), created_by_agent: emptyToUndefined(row.created_by_agent) };
}

function normalizeNotification(row: Record<string, unknown>): NotificationRecord {
  return { notification_id: str(row.notification_id), created_at: str(row.created_at), updated_at: emptyToUndefined(row.updated_at), recipient_email: str(row.recipient_email), notification_type: str(row.notification_type), channel: emptyToUndefined(row.channel), subject: str(row.subject, 'Notification'), body_preview: emptyToUndefined(row.body_preview), entity_type: emptyToUndefined(row.entity_type), entity_id: emptyToUndefined(row.entity_id), priority: priority(row.priority), status: str(row.status, 'unread') as NotificationRecord['status'], sent_at: emptyToUndefined(row.sent_at), read_at: emptyToUndefined(row.read_at), resolved_at: emptyToUndefined(row.resolved_at), failure_reason: emptyToUndefined(row.failure_reason) };
}

function normalizeEvent(row: Record<string, unknown>): EventRecord {
  return { event_id: str(row.event_id), created_at: str(row.created_at), updated_at: str(row.updated_at), event_name: str(row.event_name, 'Unnamed event'), event_slug: str(row.event_slug), event_date: emptyToUndefined(row.event_date), location: emptyToUndefined(row.location), owner_email: str(row.owner_email, 'sequoia@westpeek.ventures'), status: str(row.status, 'active') === 'closed' ? 'closed' : 'active', notes: emptyToUndefined(row.notes), public_form_enabled: !['false', '0', 'no'].includes(str(row.public_form_enabled).toLowerCase()), public_form_url: emptyToUndefined(row.public_form_url) };
}

function normalizeEventAttendee(row: Record<string, unknown>): EventAttendeeRecord {
  return { event_attendee_id: str(row.event_attendee_id), event_id: str(row.event_id), event_name: str(row.event_name, 'Event'), event_slug: str(row.event_slug), created_at: str(row.created_at), updated_at: str(row.updated_at), public_name: emptyToUndefined(row.public_name), public_email: emptyToUndefined(row.public_email), public_company: emptyToUndefined(row.public_company), public_title: emptyToUndefined(row.public_title), public_phone: emptyToUndefined(row.public_phone), public_linkedin: emptyToUndefined(row.public_linkedin), public_interest: emptyToUndefined(row.public_interest), private_context: emptyToUndefined(row.private_context), private_voice_transcript: emptyToUndefined(row.private_voice_transcript), ai_summary: emptyToUndefined(row.ai_summary), review_status: reviewStatus(row.review_status), confidence: confidence(row.confidence), missing_fields: emptyToUndefined(row.missing_fields), source_type: str(row.source_type, 'event_public_form'), created_by: str(row.created_by, 'google_sheets'), source_intake_id: emptyToUndefined(row.source_intake_id), consent_follow_up: bool(row.consent_follow_up) };
}

function str(value: unknown, fallback = '') { return String(value || fallback).trim(); }
function emptyToUndefined(value: unknown) { const text = str(value); return text || undefined; }
function split(value: unknown) { return str(value).split(',').map((item) => item.trim()).filter(Boolean); }
function bool(value: unknown) { return String(value).toLowerCase() === 'true' || value === true || String(value).toLowerCase() === 'on'; }
function owner(value: unknown) { const text = str(value).toLowerCase(); return text.includes('sequoia') ? 'Sequoia' : text.includes('scooter') ? 'Scooter' : 'Unassigned'; }
function priority(value: unknown) { const text = str(value).toLowerCase(); return text.includes('high') ? 'High' : text.includes('low') ? 'Low' : 'Normal'; }
function confidence(value: unknown) { const text = str(value).toLowerCase(); return text === 'low' || text === 'high' ? text : 'medium'; }
function reviewStatus(value: unknown) {
  const text = str(value, 'pending_human_review');
  return text as IntakeRecord['review_status'];
}
