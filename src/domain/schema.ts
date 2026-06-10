import { z } from 'zod';

export const ownerSchema = z.enum(['Sequoia', 'Scooter', 'Unassigned']);
export const touchMethodSchema = z.enum(['undecided', 'email', 'handwritten_note', 'virtual_thank_you_card', 'gift', 'intro', 'call', 'meeting', 'event_invite', 'other']);
export const touchStatusSchema = z.enum(['needed', 'planned', 'drafted', 'pending_approval', 'approved', 'sent', 'skipped', 'cancelled', 'failed']);
export const prioritySchema = z.enum(['Low', 'Normal', 'High']);
export const intakeSourceSchema = z.enum(['gmail_trigger', 'manual_note', 'pasted_notes', 'business_card', 'notes_screenshot', 'voice_note', 'business_card_later', 'voice_note_later', 'event_public_form', 'event_private_note', 'event_card_upload', 'event_screenshot', 'event_voice_note', 'pitch_lab']);
export const captureTypeSchema = z.enum(['email_thread', 'self_email_note', 'forwarded_email', 'manual_add', 'business_card', 'notes_screenshot', 'voice_note', 'thank_you_card', 'event_public_form', 'event_private_note', 'pitch_practice', 'founder_profile_lead', 'founder_story_packet', 'network_profile_self_submission', 'event_registration', 'event_interest', 'other']);
export const intakeReviewStatusSchema = z.enum(['new', 'ai_reviewed', 'pending_human_review', 'needs_human_review', 'converted', 'attached', 'dismissed', 'needs_more_info', 'lead_captured', 'pending_network_review', 'profile_updated', 'event_intake_received', 'archived']);
export const approvalStatusSchema = z.enum(['pending', 'approved', 'edited', 'rejected', 'executed', 'failed', 'cancelled']);
export const approvalRiskSchema = z.enum(['low', 'medium', 'high']);
export const notificationStatusSchema = z.enum(['unread', 'read', 'dismissed', 'resolved', 'failed']);
export const personTypeSchema = z.enum(['investor', 'founder', 'operator', 'lawyer', 'service_provider', 'media', 'general', 'unknown']);
export const dealFlowProspectSchema = z.enum(['yes', 'no', 'unknown']);
export const triggerIntentSchema = z.enum(['network', 'deal_flow', 'relationship_routing', 'event_participation', 'network_membership']);

export const quickAddSchema = z.object({
  full_name: z.string().optional().or(z.literal('')),
  email: z.string().email().optional().or(z.literal('')),
  company: z.string().optional(),
  person_type: personTypeSchema.optional(),
  deal_flow_prospect: dealFlowProspectSchema.optional(),
  relationship_type: z.string().optional(),
  context_summary: z.string().optional(),
  dealflow_relevance: z.string().optional(),
  founder_relevance: z.string().optional(),
  relationship_owner: ownerSchema,
  touch_needed: z.boolean(),
  touch_method: touchMethodSchema,
  priority: prioritySchema,
  due_date: z.string().optional(),
  tags: z.string().optional()
});

export const contactSchema = z.object({
  contact_id: z.string(),
  created_at: z.string(),
  updated_at: z.string(),
  status: z.enum(['active', 'archived']),
  full_name: z.string().min(1),
  email: z.string().email().optional(),
  company: z.string().optional(),
  person_type: personTypeSchema.optional(),
  deal_flow_prospect: dealFlowProspectSchema.optional(),
  relationship_owner: ownerSchema,
  priority: prioritySchema,
  tags: z.array(z.string()),
  context_summary: z.string().min(1),
  touch_needed: z.boolean(),
  touch_status: touchStatusSchema.optional(),
  created_by: z.string(),
  updated_by: z.string()
});

export const intakeSchema = z.object({
  intake_id: z.string(),
  created_at: z.string(),
  updated_at: z.string(),
  source: intakeSourceSchema,
  capture_type: captureTypeSchema.optional(),
  captured_by: z.string(),
  raw_text: z.string(),
  source_trigger: z.string().optional(),
  trigger_intent: triggerIntentSchema.optional(),
  person_type: personTypeSchema.optional(),
  deal_flow_prospect: dealFlowProspectSchema.optional(),
  deal_context: z.string().optional(),
  review_status: intakeReviewStatusSchema
});

export type QuickAddInput = z.infer<typeof quickAddSchema>;
