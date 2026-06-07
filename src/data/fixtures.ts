import type { ApprovalRecord, ContactRecord, IntakeRecord, NotificationRecord, RelationshipTouch } from '../domain/types';

export const initialContacts: ContactRecord[] = [
  {
    contact_id: 'contact_mike_maccombie',
    created_at: '2026-06-07T10:00:00.000Z',
    updated_at: '2026-06-07T10:00:00.000Z',
    status: 'active',
    full_name: 'Mike MacCombie',
    email: 'mike@example.com',
    company: 'MacCombie Group',
    relationship_owner: 'Scooter',
    relationship_type: 'Strategic partner / Friend of firm',
    priority: 'High',
    tags: ['Thank-you needed', 'Warm intro', 'Friend of firm'],
    context_summary: 'Helped West Peek with an intro and should receive a thoughtful thank-you.',
    touch_needed: true,
    touch_status: 'needed',
    created_by: 'scooter@westpeek.ventures',
    updated_by: 'scooter@westpeek.ventures'
  }
];

export const initialIntake: IntakeRecord[] = [
  {
    intake_id: 'intake_live_event_sarah',
    created_at: '2026-06-07T11:00:00.000Z',
    updated_at: '2026-06-07T11:00:00.000Z',
    source: 'gmail_trigger',
    captured_by: 'sequoia@westpeek.ventures',
    raw_text: '#wpnetwork\nName: Sarah Lee\nCompany: Horizon Capital\nContext: Good LP conversation at dinner.\nOwner: Sequoia\nNeeds Touch: Yes\nTouch: Email\nPriority: Normal\nDue: Next week',
    parsed_name: 'Sarah Lee',
    parsed_company: 'Horizon Capital',
    ai_summary: 'Good LP conversation at dinner; email follow-up next week.',
    ai_confidence: 'high',
    review_status: 'ai_reviewed'
  }
];

export const initialTouches: RelationshipTouch[] = [
  {
    touch_id: 'touch_mike_thank_you',
    contact_id: 'contact_mike_maccombie',
    created_at: '2026-06-07T10:10:00.000Z',
    updated_at: '2026-06-07T10:10:00.000Z',
    owner: 'Scooter',
    reason: 'Mike helped us with a valuable intro.',
    priority: 'High',
    due_date: 'This week',
    status: 'needed',
    method: 'handwritten_note',
    draft_message: 'Mike — thank you again for the thoughtful intro. We really appreciate you thinking of West Peek.'
  }
];

export const initialApprovals: ApprovalRecord[] = [
  {
    approval_id: 'approval_mike_note',
    created_at: '2026-06-07T10:20:00.000Z',
    updated_at: '2026-06-07T10:20:00.000Z',
    approval_type: 'handwritten_note',
    assigned_to: 'Scooter',
    relationship_owner: 'Scooter',
    status: 'pending',
    risk_level: 'medium',
    suggested_payload: 'Approve handwritten thank-you note draft for Mike MacCombie.'
  }
];

export const initialNotifications: NotificationRecord[] = [
  {
    notification_id: 'notification_mike_note',
    created_at: '2026-06-07T10:21:00.000Z',
    recipient_email: 'scooter@westpeek.ventures',
    notification_type: 'approval_waiting',
    subject: 'Approval needed: handwritten note for Mike MacCombie',
    entity_type: 'approval',
    entity_id: 'approval_mike_note',
    priority: 'High',
    status: 'unread'
  }
];
