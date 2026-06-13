import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { classifyIntelligentInbox } from '../../functions/_shared/providers/intelligent-inbox.ts';
import { LocalSheetsProvider } from '../../scripts/testing/providers/local-sheets-provider.mjs';

const runId = `local_gauntlet_${Date.now()}`;
const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'wpn-gauntlet-'));
const provider = new LocalSheetsProvider(path.join(dir, 'store.json'));
const stamp = new Date().toISOString();
await provider.init({ intake_queue: [], contacts: [], events: [], event_attendees: [], approvals: [], notifications: [] });

try {
  const classification = classifyIntelligentInbox(
    { subject: 'Pitch deck for Orbit Labs seed round', from: 'maya@orbit.example', to: 'info@westpeek.ventures' },
    'Founder of Orbit Labs. We are raising a seed round. Deck attached.'
  );
  assert.equal(classification.category, 'pitch');
  assert.equal(classification.capture, true);

  const intake = {
    intake_id: 'intake_orbit_pitch', gmail_message_id: 'gmail_orbit_pitch',
    gmail_ingestion_key: 'info@westpeek.ventures:gmail_orbit_pitch', source_mailbox: 'info@westpeek.ventures',
    review_status: 'pending_human_review', human_review_required: true, execution_allowed: false,
    created_at: stamp, updated_at: stamp, proof_run_id: runId, proof_test_id: 'shared-inbox-founder',
    proof_fixture: true, proof_created_at: stamp, proof_cleanup_policy: 'archive', proof_expires_at: new Date(Date.now()+3600000).toISOString()
  };
  const races = await Promise.all(Array.from({ length: 10 }, () => provider.appendRow('intake_queue', intake)));
  assert.equal(races.filter((result) => result.duplicate === false).length, 1, 'exactly one canonical intake write');
  assert.equal((await provider.readSnapshot({ fresh: true })).intake_queue.length, 1);

  const malformed = { contact_id: 'contact_1', full_name: 'Maya Founder', email: 'maya@orbit.example', status: 'active', proof_run_id: runId, proof_fixture: true };
  await provider.appendRow('contacts', malformed);
  const firstMaintenance = await provider.runMaintenance({ runId: `${runId}_maintenance_1` });
  assert.equal(firstMaintenance.repairs > 0, true);
  const secondMaintenance = await provider.runMaintenance({ runId: `${runId}_maintenance_2` });
  assert.equal(secondMaintenance.idempotent, true);

  await provider.updateRows('contacts', [{ rowIndex: 2, values: { status: 'archived', archived_at: stamp, archived_by: 'operator@westpeek.test', archive_reason: 'gauntlet' } }]);
  assert.equal((await provider.readSnapshot({ fresh: true })).contacts[0].status, 'archived');
  await provider.updateRows('contacts', [{ rowIndex: 2, values: { status: 'active', restored_at: stamp, restored_by: 'operator@westpeek.test' } }]);
  assert.equal((await provider.readSnapshot({ fresh: true })).contacts[0].status, 'active');

  await provider.appendRow('events', { event_id: 'event_1', status: 'active', public_form_enabled: true, created_at: stamp, updated_at: stamp, proof_run_id: runId, proof_fixture: true });
  await provider.appendRow('event_attendees', { event_attendee_id: 'attendee_1', event_id: 'event_1', created_at: stamp, updated_at: stamp, proof_run_id: runId, proof_fixture: true });
  await provider.updateRows('events', [{ rowIndex: 2, values: { status: 'revoked', public_form_enabled: false, revoked_at: stamp } }]);
  let snapshot = await provider.readSnapshot({ fresh: true });
  assert.equal(snapshot.events[0].status, 'revoked');
  assert.equal(snapshot.event_attendees.length, 1, 'prior attendee preserved');
  await provider.updateRows('events', [{ rowIndex: 2, values: { status: 'active', public_form_enabled: true, restored_at: stamp } }]);

  await provider.appendRow('approvals', { approval_id: 'approval_1', status: 'pending', created_at: stamp, updated_at: stamp, proof_run_id: runId, proof_fixture: true });
  await provider.appendRow('notifications', { notification_id: 'notification_1', entity_id: 'approval_1', status: 'unread', created_at: stamp, proof_run_id: runId, proof_fixture: true });
  await provider.updateRows('approvals', [{ rowIndex: 2, values: { status: 'approved', approved_at: stamp } }]);
  await provider.updateRows('notifications', [{ rowIndex: 2, values: { status: 'resolved', resolved_at: stamp } }]);
  snapshot = await provider.readSnapshot({ fresh: true });
  assert.equal(snapshot.approvals[0].status, 'approved');
  assert.equal(snapshot.notifications[0].status, 'resolved');

  const cleanup = await provider.cleanupProofRun(runId);
  assert.equal(cleanup.cleaned >= 6, true);
  snapshot = await provider.readSnapshot({ fresh: true });
  for (const tab of ['intake_queue', 'contacts', 'events', 'event_attendees', 'approvals', 'notifications']) {
    assert.equal(snapshot[tab].filter((row) => row.proof_run_id === runId && row.proof_status !== 'proof_cleaned').length, 0, `${tab} cleanup`);
  }
  console.log('PASS local Master Gauntlet: founder intake, 10-way dedupe, maintenance idempotency, lifecycle, approvals, notifications, fresh readback, cleanup');
} finally {
  await fs.rm(dir, { recursive: true, force: true });
}
