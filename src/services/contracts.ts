export interface GmailProvider {
  connect(userEmail: string): Promise<{ status: 'connected'; accountEmail: string }>;
  syncTriggeredMessages(userEmail: string): Promise<{ imported: number; trigger: string }>;
}

export interface SheetsProvider {
  appendContact(payload: unknown): Promise<{ contactId: string }>;
  appendIntake(payload: unknown): Promise<{ intakeId: string }>;
  readContacts(): Promise<unknown[]>;
}

export interface RelationshipAiProvider {
  summarizeIntake(rawText: string): Promise<{ summary: string; confidence: 'low' | 'medium' | 'high' }>;
  draftTouch(context: string): Promise<{ draft: string }>;
}

export interface HandwrittenNoteProvider {
  createDraft(payload: { recipientName: string; message: string }): Promise<{ draftId: string; vendorUrl: string }>;
}

export class ProviderNotConfiguredError extends Error {
  constructor(provider: string) {
    super(`${provider} is not configured in this baseline artifact. Configure provider credentials before production execution.`);
    this.name = 'ProviderNotConfiguredError';
  }
}
