export type Role = 'Admin' | 'Partner' | 'Operator' | 'Assistant' | 'Read-only';
export type Owner = 'Sequoia' | 'Scooter' | 'Unassigned';
export type Priority = 'Low' | 'Normal' | 'High';
export type TouchMethod = 'undecided' | 'email' | 'handwritten_note' | 'virtual_thank_you_card' | 'gift' | 'intro' | 'call' | 'meeting' | 'event_invite' | 'other';
export type TouchStatus = 'needed' | 'planned' | 'drafted' | 'pending_approval' | 'approved' | 'approved_ready_to_send' | 'opened_vendor' | 'will_do_myself' | 'sent' | 'sent_externally' | 'completed' | 'skipped' | 'cancelled' | 'failed';
export type ApprovalRisk = 'low' | 'medium' | 'high';
export type ApprovalStatus = 'pending' | 'approved' | 'edited' | 'rejected' | 'executed' | 'failed' | 'cancelled';
export type NotificationStatus = 'unread' | 'read' | 'dismissed' | 'resolved' | 'failed';
export type AiSuggestionStatus = 'pending' | 'approved' | 'edited' | 'dismissed' | 'applied';
export type AiSuggestionType = 'contact_cleanup' | 'duplicate_candidate' | 'touch_recommendation' | 'email_draft' | 'handwritten_note_draft' | 'gift_idea' | 'follow_up_recommendation' | 'context_summary' | 'tag_recommendation' | 'owner_recommendation' | 'priority_recommendation';
export type IntakeSource = 'gmail_trigger' | 'manual_note' | 'pasted_notes' | 'business_card' | 'notes_screenshot' | 'voice_note' | 'business_card_later' | 'voice_note_later' | 'event_public_form' | 'event_private_note' | 'event_card_upload' | 'event_screenshot' | 'event_voice_note';
export type CaptureType = 'email_thread' | 'self_email_note' | 'forwarded_email' | 'manual_add' | 'business_card' | 'notes_screenshot' | 'voice_note' | 'thank_you_card' | 'event_public_form' | 'event_private_note' | 'other';
export type IntakeReviewStatus = 'new' | 'ai_reviewed' | 'pending_human_review' | 'needs_human_review' | 'converted' | 'attached' | 'dismissed' | 'needs_more_info';
export type InteractionType = 'email' | 'call' | 'meeting' | 'intro' | 'event' | 'note' | 'touch' | 'gift' | 'handwritten_note' | 'other';
export type PersonType = 'investor' | 'founder' | 'operator' | 'lawyer' | 'service_provider' | 'media' | 'general' | 'unknown';
export type DealFlowProspect = 'yes' | 'no' | 'unknown';
export type TriggerIntent = 'network' | 'deal_flow';


export interface EventRecord {
  event_id: string;
  created_at: string;
  updated_at: string;
  event_name: string;
  event_slug: string;
  event_date?: string;
  location?: string;
  owner_email: string;
  status: 'active' | 'closed';
  notes?: string;
  public_form_enabled: boolean;
  public_form_url?: string;
}

export interface EventAttendeeRecord {
  event_attendee_id: string;
  event_id: string;
  event_name: string;
  event_slug: string;
  created_at: string;
  updated_at: string;
  public_name?: string;
  public_email?: string;
  public_company?: string;
  public_title?: string;
  public_phone?: string;
  public_linkedin?: string;
  public_interest?: string;
  private_context?: string;
  private_voice_transcript?: string;
  ai_summary?: string;
  review_status: IntakeReviewStatus;
  confidence?: 'low' | 'medium' | 'high';
  missing_fields?: string;
  source_type: string;
  created_by: string;
  source_intake_id?: string;
  consent_follow_up?: boolean;
}

export interface ContactRecord {
  contact_id: string;
  created_at: string;
  updated_at: string;
  status: 'active' | 'archived';
  first_name?: string;
  last_name?: string;
  full_name: string;
  email?: string;
  phone?: string;
  company?: string;
  title?: string;
  linkedin_url?: string;
  city?: string;
  relationship_owner: Owner;
  additional_owners?: Owner[];
  source_type?: string;
  source_event?: string;
  source_detail?: string;
  relationship_type?: string;
  person_type?: PersonType;
  deal_flow_prospect?: DealFlowProspect;
  priority: Priority;
  tags: string[];
  notes_summary?: string;
  context_summary: string;
  last_touch_date?: string;
  next_follow_up_date?: string;
  follow_up_status?: string;
  touch_needed: boolean;
  touch_status?: TouchStatus;
  warmth?: string;
  trust_level?: string;
  strategic_value?: string;
  capital_relevance?: string;
  dealflow_relevance?: string;
  founder_relevance?: string;
  lp_relevance?: string;
  who_introduced_us?: string;
  what_we_promised?: string;
  what_they_promised?: string;
  what_they_care_about?: string;
  we_can_help_them_with?: string;
  helped_us_with?: string;
  gratitude_reason?: string;
  personal_context?: string;
  conversation_energy?: string;
  created_by: string;
  updated_by: string;
}

export interface IntakeRecord {
  intake_id: string;
  created_at: string;
  updated_at: string;
  source: IntakeSource;
  capture_type?: CaptureType;
  captured_by: string;
  source_user_email?: string;
  gmail_message_id?: string;
  gmail_thread_id?: string;
  source_trigger?: string;
  trigger_intent?: TriggerIntent;
  person_type?: PersonType;
  deal_flow_prospect?: DealFlowProspect;
  deal_context?: string;
  raw_text: string;
  email_subject?: string;
  email_from?: string;
  email_to?: string;
  email_date?: string;
  parsed_name?: string;
  parsed_email?: string;
  parsed_phone?: string;
  parsed_company?: string;
  parsed_title?: string;
  parsed_website?: string;
  parsed_notes?: string;
  parsed_owner?: Owner;
  parsed_touch?: TouchMethod;
  parsed_priority?: Priority;
  parsed_due?: string;
  parsed_needs_touch?: boolean;
  event_id?: string;
  event_name?: string;
  event_slug?: string;
  source_file_name?: string;
  source_file_type?: string;
  extracted_text?: string;
  transcript_text?: string;
  missing_fields?: string;
  ai_summary?: string;
  ai_confidence?: 'low' | 'medium' | 'high';
  possible_duplicate_contact_id?: string;
  internal_data_trace?: string;
  human_review_required?: boolean;
  execution_allowed?: boolean;
  review_status: IntakeReviewStatus;
  reviewed_by?: string;
  reviewed_at?: string;
  converted_contact_id?: string;
  attached_contact_id?: string;
  dismiss_reason?: string;
}

export interface InteractionRecord {
  interaction_id: string;
  contact_id: string;
  created_at: string;
  interaction_type: InteractionType;
  channel: string;
  summary: string;
  raw_source?: string;
  owner: Owner;
  created_by: string;
  follow_up_required: boolean;
  follow_up_date?: string;
  source_intake_id?: string;
  gmail_message_id?: string;
  notes?: string;
}

export interface RelationshipTouch {
  touch_id: string;
  contact_id: string;
  created_at: string;
  updated_at: string;
  owner: Owner;
  reason: string;
  priority: Priority;
  due_date: string;
  status: TouchStatus;
  method: TouchMethod;
  contact_email?: string;
  recipient_name?: string;
  recipient_email?: string;
  company?: string;
  card_type?: string;
  card_title?: string;
  email_subject?: string;
  email_body?: string;
  approval_required?: boolean;
  execution_allowed?: boolean;
  internal_data_trace?: string;
  vendor_name?: string;
  vendor_url?: string;
  draft_message?: string;
  approved_by?: string;
  approved_at?: string;
  sent_date?: string;
  gift_cost?: string;
  notes?: string;
  created_by?: string;
  updated_by?: string;
  fulfillment_mode?: 'vendor' | 'self';
  fulfillment_status?: string;
  vendor_fit?: string;
  vendor_note?: string;
  external_order_id?: string;
  sent_at?: string;
  fulfillment_notes?: string;
}

export interface AiSuggestionRecord {
  suggestion_id: string;
  created_at: string;
  updated_at: string;
  suggestion_type: AiSuggestionType;
  source_entity_type: string;
  source_entity_id: string;
  confidence: 'low' | 'medium' | 'high';
  status: AiSuggestionStatus;
  suggested_payload: string;
  reasoning_summary: string;
  reviewed_by?: string;
  reviewed_at?: string;
  applied_entity_type?: string;
  applied_entity_id?: string;
  created_by_agent?: string;
}

export interface ApprovalRecord {
  approval_id: string;
  created_at: string;
  updated_at: string;
  approval_type: string;
  source_entity_type?: string;
  source_entity_id?: string;
  requested_by?: string;
  assigned_to: Owner;
  relationship_owner: Owner;
  status: ApprovalStatus;
  risk_level: ApprovalRisk;
  suggested_payload: string;
  human_edits?: string;
  approved_by?: string;
  approved_at?: string;
  rejected_by?: string;
  rejected_at?: string;
  execution_status?: string;
  execution_result?: string;
  last_notified_at?: string;
  next_reminder_at?: string;
  escalation_level?: string;
}

export interface NotificationRecord {
  notification_id: string;
  created_at: string;
  updated_at?: string;
  recipient_email: string;
  recipient_user_id?: string;
  notification_type: string;
  channel?: string;
  subject: string;
  body_preview?: string;
  entity_type?: string;
  entity_id?: string;
  priority: Priority;
  status: NotificationStatus;
  sent_at?: string;
  read_at?: string;
  resolved_at?: string;
  failure_reason?: string;
}

export interface OAuthAccountRecord {
  account_id: string;
  user_email: string;
  google_account_email: string;
  connected_at: string;
  last_sync_at?: string;
  sync_status: string;
  scopes: string[];
  token_status: string;
  last_error?: string;
}

export interface SettingRecord {
  key: string;
  value: string;
  updated_at: string;
  updated_by: string;
}

export interface AuditLogRecord {
  audit_id: string;
  created_at: string;
  actor: string;
  action: string;
  entity_type: string;
  entity_id: string;
  summary: string;
  metadata?: string;
  ip_or_session_id?: string;
}
