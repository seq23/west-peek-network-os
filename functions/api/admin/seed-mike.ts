import { requireAuthenticatedUser } from '../../_shared/auth';
import { json } from '../../_shared/json';
import { appendRecord, readTab, sheetsUnavailable, type RuntimeEnv } from '../../_shared/sheets';

type Context = { request: Request; env: RuntimeEnv & { ADMIN_EMAIL_ALLOWLIST?: string; APP_SESSION_SECRET?: string } };

const now = '2026-06-07T10:00:00.000Z';

const mikeContact = {
  contact_id: 'contact_mike_maccombie',
  created_at: now,
  updated_at: now,
  status: 'active',
  full_name: 'Mike MacCombie',
  email: 'mike@example.com',
  company: 'MacCombie Group',
  relationship_owner: 'Scooter',
  priority: 'High',
  tags: 'Thank-you needed, Warm intro, Friend of firm',
  context_summary: 'Seeded demo contact. Helped West Peek with an intro and should receive a thoughtful thank-you.',
  touch_needed: 'true',
  touch_status: 'needed',
  created_by: 'system_seed_fixture',
  updated_by: 'system_seed_fixture'
};

const mikeTouch = {
  touch_id: 'touch_mike_thank_you',
  created_at: '2026-06-07T10:10:00.000Z',
  updated_at: '2026-06-07T10:10:00.000Z',
  contact_id: 'contact_mike_maccombie',
  contact_email: 'mike@example.com',
  recipient_name: 'Mike MacCombie',
  recipient_email: 'mike@example.com',
  company: 'MacCombie Group',
  owner: 'Scooter',
  reason: 'Mike helped West Peek with a valuable intro.',
  priority: 'High',
  due_date: 'This week',
  status: 'pending_approval',
  method: 'handwritten_note',
  card_type: 'handwritten_note',
  card_title: 'Thank you from West Peek',
  draft_message: 'Mike — thank you again for the thoughtful intro. We really appreciate you thinking of West Peek.',
  email_subject: 'Thank you',
  email_body: 'Mike — thank you again for the thoughtful intro. We really appreciate you thinking of West Peek.',
  approval_required: 'true',
  execution_allowed: 'false',
  internal_data_trace: JSON.stringify({ source: 'seed_mike_fixture', human_review_required: true, execution_allowed: false }),
  created_by: 'system_seed_fixture',
  updated_by: 'system_seed_fixture'
};

const mikeApproval = {
  approval_id: 'approval_mike_note',
  created_at: '2026-06-07T10:20:00.000Z',
  updated_at: '2026-06-07T10:20:00.000Z',
  approval_type: 'handwritten_note',
  source_entity_type: 'relationship_touch',
  source_entity_id: 'touch_mike_thank_you',
  requested_by: 'system_seed_fixture',
  assigned_to: 'Scooter',
  relationship_owner: 'Scooter',
  status: 'pending',
  risk_level: 'medium',
  suggested_payload: 'Approve handwritten thank-you note draft for Mike MacCombie.',
  approved_by: '',
  approved_at: '',
  rejected_by: '',
  rejected_at: ''
};

const mikeNotification = {
  notification_id: 'notification_mike_note',
  created_at: '2026-06-07T10:21:00.000Z',
  updated_at: '2026-06-07T10:21:00.000Z',
  recipient_email: 'scooter@westpeek.ventures',
  notification_type: 'approval_waiting',
  channel: 'in_app',
  subject: 'Approval needed: handwritten note for Mike MacCombie',
  body_preview: 'Mike thank-you note is ready for human review.',
  entity_type: 'approval',
  entity_id: 'approval_mike_note',
  priority: 'High',
  status: 'unread',
  sent_at: '',
  read_at: '',
  resolved_at: '',
  failure_reason: ''
};

export async function onRequestPost({ request, env }: Context) {
  try {
    const user = await requireAuthenticatedUser(request, env);
    const contacts = await readTab(env, 'contacts');
    const alreadySeeded = contacts.some((row: Record<string, unknown>) =>
      String(row.contact_id || '') === mikeContact.contact_id ||
      String(row.full_name || '').trim().toLowerCase() === 'mike maccombie'
    );

    if (alreadySeeded) {
      return json({ ok: true, status: 'already_present', seeded: false, contact_id: mikeContact.contact_id, checked_by: user.email });
    }

    await appendRecord(env, 'contacts', mikeContact);
    await appendRecord(env, 'relationship_touches', mikeTouch);
    await appendRecord(env, 'approvals', mikeApproval);
    await appendRecord(env, 'notifications', mikeNotification);

    return json({
      ok: true,
      status: 'seeded_to_google_sheets',
      seeded: true,
      contact_id: mikeContact.contact_id,
      touch_id: mikeTouch.touch_id,
      approval_id: mikeApproval.approval_id,
      notification_id: mikeNotification.notification_id,
      checked_by: user.email,
      human_review_required: true,
      execution_allowed: false
    });
  } catch (error) {
    const detail = error instanceof Error ? error.message : 'Could not seed Mike fixture.';
    if (detail.includes('Google Sheets')) return sheetsUnavailable(error);
    return json({ ok: false, error: detail }, { status: detail.includes('Authentication') ? 401 : 500 });
  }
}
