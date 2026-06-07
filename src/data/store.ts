import { initialApprovals, initialContacts, initialIntake, initialNotifications, initialTouches } from './fixtures';
import type { ApprovalRecord, ContactRecord, IntakeRecord, NotificationRecord, RelationshipTouch, TouchMethod } from '../domain/types';
import { approveRecord, buildIntakeFromCapture, convertIntakeToContact, createApprovalForTouch, createNotificationForApproval, createTouchForContact, findDuplicateContact, rejectRecord } from '../domain/workflows';

const CONTACTS_KEY = 'wpn.contacts';
const INTAKE_KEY = 'wpn.intake';
const TOUCHES_KEY = 'wpn.touches';
const APPROVALS_KEY = 'wpn.approvals';
const NOTIFICATIONS_KEY = 'wpn.notifications';
const OPERATOR_EMAIL_BY_OWNER = { Sequoia: 'sequoia@westpeek.ventures', Scooter: 'scooter@westpeek.ventures', Unassigned: 'sequoia@westpeek.ventures' } as const;

function read<T>(key: string, fallback: T): T {
  if (typeof localStorage === 'undefined') return fallback;
  const raw = localStorage.getItem(key);
  if (!raw) {
    localStorage.setItem(key, JSON.stringify(fallback));
    return structuredClone(fallback);
  }
  try { return JSON.parse(raw) as T; } catch { return structuredClone(fallback); }
}

function write<T>(key: string, value: T): T {
  if (typeof localStorage !== 'undefined') localStorage.setItem(key, JSON.stringify(value));
  return value;
}

function now() { return new Date().toISOString(); }

function saveTouchApprovalAndNotification(contact: ContactRecord, touch: RelationshipTouch) {
  const approval = createApprovalForTouch(touch, contact);
  const notification = createNotificationForApproval(approval, OPERATOR_EMAIL_BY_OWNER[contact.relationship_owner]);
  write(TOUCHES_KEY, [touch, ...store.touches()]);
  write(APPROVALS_KEY, [approval, ...store.approvals()]);
  write(NOTIFICATIONS_KEY, [notification, ...store.notifications()]);
}

export const store = {
  contacts: () => read<ContactRecord[]>(CONTACTS_KEY, initialContacts),
  intake: () => read<IntakeRecord[]>(INTAKE_KEY, initialIntake),
  touches: () => read<RelationshipTouch[]>(TOUCHES_KEY, initialTouches),
  approvals: () => read<ApprovalRecord[]>(APPROVALS_KEY, initialApprovals),
  notifications: () => read<NotificationRecord[]>(NOTIFICATIONS_KEY, initialNotifications),
  saveContacts: (contacts: ContactRecord[]) => write(CONTACTS_KEY, contacts),
  addContact(contact: ContactRecord, touchMethod: TouchMethod = 'undecided') {
    const existing = store.contacts();
    const duplicate = findDuplicateContact(contact, existing);
    if (duplicate) {
      throw new Error(`This person may already be in the West Peek Network: ${duplicate.full_name}`);
    }
    write(CONTACTS_KEY, [contact, ...existing]);
    if (contact.touch_needed) {
      const touch = createTouchForContact(contact, touchMethod, contact.context_summary, contact.priority, contact.next_follow_up_date || 'This week');
      saveTouchApprovalAndNotification(contact, touch);
    }
    return contact;
  },
  addIntakeFromRaw(rawText: string, capturedBy = 'sequoia@westpeek.ventures') {
    const item = buildIntakeFromCapture(rawText, capturedBy);
    write(INTAKE_KEY, [item, ...store.intake()]);
    return item;
  },
  convertIntake(intakeId: string) {
    const items = store.intake();
    const item = items.find((candidate) => candidate.intake_id === intakeId);
    if (!item) throw new Error('Intake item not found.');
    const contact = convertIntakeToContact(item);
    const duplicate = findDuplicateContact(contact, store.contacts());
    if (duplicate) throw new Error(`This person may already be in the West Peek Network: ${duplicate.full_name}`);
    write(CONTACTS_KEY, [contact, ...store.contacts()]);
    write(INTAKE_KEY, items.map((candidate) => candidate.intake_id === intakeId ? { ...candidate, review_status: 'converted', reviewed_by: 'local-baseline-user', reviewed_at: now(), converted_contact_id: contact.contact_id, updated_at: now() } : candidate));
    if (contact.touch_needed) {
      const touch = createTouchForContact(contact, 'undecided', contact.context_summary, contact.priority, 'This week');
      saveTouchApprovalAndNotification(contact, touch);
    }
    return contact;
  },
  attachIntakeToExisting(intakeId: string) {
    const items = store.intake();
    const item = items.find((candidate) => candidate.intake_id === intakeId);
    if (!item) throw new Error('Intake item not found.');
    const candidate = convertIntakeToContact(item);
    const duplicate = findDuplicateContact(candidate, store.contacts());
    if (!duplicate) throw new Error('No existing West Peek Network person matched this intake item.');
    write(INTAKE_KEY, items.map((row) => row.intake_id === intakeId ? { ...row, review_status: 'attached', reviewed_by: 'local-baseline-user', reviewed_at: now(), attached_contact_id: duplicate.contact_id, updated_at: now() } : row));
    return duplicate;
  },
  dismissIntake(intakeId: string) {
    write(INTAKE_KEY, store.intake().map((item) => item.intake_id === intakeId ? { ...item, review_status: 'dismissed', dismiss_reason: 'Dismissed by operator', updated_at: now() } : item));
  },
  approve(approvalId: string) {
    const approvals = store.approvals();
    const approval = approvals.find((candidate) => candidate.approval_id === approvalId);
    if (!approval) throw new Error('Approval not found.');
    const approved = approveRecord(approval, 'local-baseline-user');
    write(APPROVALS_KEY, approvals.map((candidate) => candidate.approval_id === approvalId ? approved : candidate));
    write(NOTIFICATIONS_KEY, store.notifications().map((n) => n.entity_id === approvalId ? { ...n, status: 'resolved', resolved_at: now(), updated_at: now() } : n));
    return approved;
  },
  reject(approvalId: string) {
    const approvals = store.approvals();
    const approval = approvals.find((candidate) => candidate.approval_id === approvalId);
    if (!approval) throw new Error('Approval not found.');
    const rejected = rejectRecord(approval, 'local-baseline-user');
    write(APPROVALS_KEY, approvals.map((candidate) => candidate.approval_id === approvalId ? rejected : candidate));
    write(NOTIFICATIONS_KEY, store.notifications().map((n) => n.entity_id === approvalId ? { ...n, status: 'resolved', resolved_at: now(), updated_at: now() } : n));
    return rejected;
  },
  markNotificationRead(id: string) { return write(NOTIFICATIONS_KEY, store.notifications().map((n) => n.notification_id === id ? { ...n, status: 'read', read_at: now(), updated_at: now() } : n)); },
  reset() {
    write(CONTACTS_KEY, initialContacts);
    write(INTAKE_KEY, initialIntake);
    write(TOUCHES_KEY, initialTouches);
    write(APPROVALS_KEY, initialApprovals);
    write(NOTIFICATIONS_KEY, initialNotifications);
  }
};
