import fs from 'node:fs/promises';
import path from 'node:path';

const clone = (value) => JSON.parse(JSON.stringify(value));

export class LocalSheetsProvider {
  constructor(filePath) {
    this.filePath = path.resolve(filePath);
    this.queue = Promise.resolve();
  }

  async init(seed = {}) {
    await fs.mkdir(path.dirname(this.filePath), { recursive: true });
    try { await fs.access(this.filePath); }
    catch { await this.#write(seed); }
  }

  async readSnapshot(options = {}) {
    const data = await this.#read();
    return { ...clone(data), __meta: { freshnessRequested: options.fresh === true, freshnessServed: true, sourceTimestamp: new Date().toISOString(), cacheAgeMs: 0 } };
  }

  async appendRow(tab, row) {
    return this.#exclusive(async () => {
    const data = await this.#read();
    data[tab] ||= [];
    const stableId = String(row.intake_id || row.contact_id || row.event_id || row.proof_run_id || `${tab}_${data[tab].length + 1}`);
    if (data[tab].some((item) => this.#sameIdentity(item, row))) {
      return { tab, stableId, duplicate: true };
    }
    data[tab].push(clone(row));
    await this.#write(data);
    return { tab, rowIndex: data[tab].length + 1, stableId, duplicate: false };
    });
  }

  async updateRows(tab, updates) {
    return this.#exclusive(async () => {
    const data = await this.#read();
    data[tab] ||= [];
    for (const update of updates) {
      const index = update.rowIndex - 2;
      if (index < 0 || index >= data[tab].length) throw new Error(`LOCAL_SHEETS_ROW_NOT_FOUND:${tab}:${update.rowIndex}`);
      data[tab][index] = { ...data[tab][index], ...clone(update.values) };
    }
    await this.#write(data);
    });
  }

  async runMaintenance({ runId, dryRun = false }) {
    return this.#exclusive(async () => {
    const data = await this.#read();
    let repairs = 0;
    const warnings = [];
    for (const [tab, rows] of Object.entries(data)) {
      if (!Array.isArray(rows)) continue;
      for (const row of rows) {
        if (!row.created_at) { repairs += 1; if (!dryRun) row.created_at = new Date().toISOString(); }
        if (!row.updated_at) { repairs += 1; if (!dryRun) row.updated_at = row.created_at || new Date().toISOString(); }
      }
      const seen = new Set();
      for (const row of rows) {
        const key = String(row.gmail_ingestion_key || row.gmail_message_id || row.email || '').toLowerCase();
        if (key && seen.has(key)) warnings.push(`${tab}:possible_duplicate:${key}`);
        if (key) seen.add(key);
      }
    }
    if (!dryRun) await this.#write(data);
    return { runId, repairs, warnings, idempotent: repairs === 0 };
    });
  }

  async cleanupProofRun(runId) {
    return this.#exclusive(async () => {
    const data = await this.#read();
    let cleaned = 0;
    for (const rows of Object.values(data)) {
      if (!Array.isArray(rows)) continue;
      for (const row of rows) {
        if (row.proof_run_id === runId && row.proof_fixture === true && row.proof_status !== 'proof_cleaned') {
          row.proof_status = 'proof_cleaned';
          row.proof_cleaned_at = new Date().toISOString();
          row.proof_cleanup_run_id = runId;
          cleaned += 1;
        }
      }
    }
    await this.#write(data);
    return { runId, cleaned };
    });
  }

  #exclusive(operation) {
    const next = this.queue.then(operation, operation);
    this.queue = next.then(() => undefined, () => undefined);
    return next;
  }

  #sameIdentity(a, b) {
    const keys = ['gmail_ingestion_key', 'gmail_message_id', 'gmail_rfc_message_id', 'intake_id', 'contact_id', 'event_id'];
    return keys.some((key) => a[key] && b[key] && String(a[key]).toLowerCase() === String(b[key]).toLowerCase());
  }

  async #read() { return JSON.parse(await fs.readFile(this.filePath, 'utf8')); }
  async #write(value) { await fs.writeFile(this.filePath, `${JSON.stringify(value, null, 2)}\n`, 'utf8'); }
}
