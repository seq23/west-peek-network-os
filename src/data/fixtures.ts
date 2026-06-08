import type { ApprovalRecord, ContactRecord, EventAttendeeRecord, EventRecord, IntakeRecord, NotificationRecord, RelationshipTouch } from '../domain/types';

// Fresh browser sessions must not show demo people before they exist in Google Sheets.
// Local fallback stays empty; real rows come from /api/sheets/snapshot after Google OAuth.
export const initialContacts: ContactRecord[] = [];
export const initialIntake: IntakeRecord[] = [];
export const initialTouches: RelationshipTouch[] = [];
export const initialApprovals: ApprovalRecord[] = [];
export const initialNotifications: NotificationRecord[] = [];
export const initialEvents: EventRecord[] = [];
export const initialEventAttendees: EventAttendeeRecord[] = [];
