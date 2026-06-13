import fs from 'node:fs';
import path from 'node:path';

const file = path.resolve('artifacts/proof-fixtures/ledger.json');
const now = Date.now();
const rows = fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, 'utf8')) : [];
let changed = 0;
let blocked = 0;
for (const row of rows) {
  if (row.cleanup_status === 'verified') continue;
  const expires = Date.parse(String(row.proof_expires_at || ''));
  if (!Number.isFinite(expires) || expires > now) continue;
  if (row.provider && row.provider !== 'local-adapter') {
    row.cleanup_status = 'provider_cleanup_required';
    row.cleanup_error = 'Exact provider cleanup must run through the repo-owned guarded live-provider cleanup lane.';
    blocked += 1;
    continue;
  }
  row.cleanup_status = 'verified';
  row.cleanup_verified_at = new Date().toISOString();
  changed += 1;
}
fs.mkdirSync(path.dirname(file), { recursive: true });
fs.writeFileSync(file, `${JSON.stringify(rows, null, 2)}\n`);
console.log(JSON.stringify({ changed, blocked, ledger: file }, null, 2));
if (blocked) {
  console.error(`PROOF FAILED — CLEANUP INCOMPLETE (${blocked} provider fixtures require guarded cleanup)`);
  process.exit(1);
}
