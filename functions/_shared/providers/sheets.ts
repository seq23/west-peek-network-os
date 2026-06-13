export type CanonicalTab = string;
export type RowRef = { tab: string; rowIndex?: number; stableId?: string };
export type RowUpdate = { rowIndex: number; values: Record<string, unknown> };
export type MaintenanceInput = { runId: string; dryRun?: boolean };
export type MaintenanceResult = { runId: string; repairs: number; warnings: string[]; idempotent: boolean };
export interface SheetsProvider {
  readSnapshot(options?: { fresh?: boolean }): Promise<Record<string, unknown[]>>;
  appendRow(tab: CanonicalTab, row: Record<string, unknown>): Promise<RowRef>;
  updateRows(tab: CanonicalTab, updates: RowUpdate[]): Promise<void>;
  runMaintenance(input: MaintenanceInput): Promise<MaintenanceResult>;
}
