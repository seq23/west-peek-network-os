import assert from 'node:assert/strict';
import { latestRecord, recordTimestamp } from '../../functions/_shared/records.ts';

const malformed = { id: 'bad', updated_at: 'not-a-date', created_at: 'also-bad' };
const older = { id: 'older', updated_at: '2026-06-12T10:00:00.000Z' };
const newer = { id: 'newer', updated_at: '2026-06-13T10:00:00.000Z' };
assert.equal(recordTimestamp(malformed), 0);
assert.equal(latestRecord([malformed, older, newer])?.id, 'newer');
assert.equal(latestRecord([newer, malformed, older])?.id, 'newer');
assert.equal(latestRecord([]), undefined);
console.log('latest-record selection: PASS');
