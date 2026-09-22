/**
 * Site-form intake, I/O half. The decisions live in `siteFormContact.ts`; this
 * file is the part that talks to Google Sheets.
 */

import { appendRecord, readTabPhysicalRows, updateRecordByRowNumber, type RuntimeEnv } from './sheets';
import { buildSiteFormContact, buildSiteFormUpdate, findExistingContact, text, type ProofContext, type SiteFormEnv } from './siteFormContact';

export * from './siteFormContact';

export interface SiteFormIntakeEnv extends SiteFormEnv, RuntimeEnv {}

/**
 * Append, or update in place. Returns what happened so the caller can say so.
 */
export async function upsertSiteFormContact(env: SiteFormIntakeEnv, payload: Record<string, unknown>, proof: ProofContext) {
  const rows = await readTabPhysicalRows(env, 'contacts');
  const email = text(payload.email).toLowerCase();
  const existing = findExistingContact(rows, email, proof);
  if (existing) {
    const updated = buildSiteFormUpdate(existing.record, payload, proof);
    await updateRecordByRowNumber(env, 'contacts', existing.rowNumber, updated);
    return { result: 'updated' as const, contact_id: String(updated.contact_id || ''), row_number: existing.rowNumber };
  }
  const contact = buildSiteFormContact(payload, proof);
  const written = await appendRecord(env, 'contacts', contact);
  return { result: 'created' as const, contact_id: contact.contact_id, row_number: written.row_number };
}

