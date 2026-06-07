import { z } from 'zod';

export const ownerSchema = z.enum(['Sequoia', 'Scooter', 'Unassigned']);
export const touchMethodSchema = z.enum(['undecided', 'email', 'handwritten_note', 'gift', 'intro', 'call', 'meeting', 'event_invite', 'other']);
export const touchStatusSchema = z.enum(['needed', 'planned', 'drafted', 'pending_approval', 'approved', 'sent', 'skipped', 'cancelled', 'failed']);
export const prioritySchema = z.enum(['Low', 'Normal', 'High']);
export const intakeSourceSchema = z.enum(['gmail_trigger', 'manual_note', 'pasted_notes', 'business_card_later', 'voice_note_later']);
export const intakeReviewStatusSchema = z.enum(['new', 'ai_reviewed', 'needs_human_review', 'converted', 'attached', 'dismissed', 'needs_more_info']);
export const approvalStatusSchema = z.enum(['pending', 'approved', 'edited', 'rejected', 'executed', 'failed', 'cancelled']);
export const approvalRiskSchema = z.enum(['low', 'medium', 'high']);
export const notificationStatusSchema = z.enum(['unread', 'read', 'dismissed', 'resolved', 'failed']);

export const quickAddSchema = z.object({
  full_name: z.string().min(1, 'Name is required'),
  email: z.string().email().optional().or(z.literal('')),
  company: z.string().optional(),
  context_summary: z.string().min(1, 'Context is required'),
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
  captured_by: z.string(),
  raw_text: z.string(),
  review_status: intakeReviewStatusSchema
});

export type QuickAddInput = z.infer<typeof quickAddSchema>;
