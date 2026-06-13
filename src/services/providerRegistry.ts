import type { GmailProvider, HandwrittenNoteProvider, RelationshipAiProvider, SheetsProvider } from './contracts';

function runtimeOnly(provider: string): never {
  throw new Error(`${provider} is a deployed Functions provider. Use the documented /api/* runtime route; this client registry is status-only and must not be treated as a production implementation.`);
}

export const gmailProvider: GmailProvider = {
  async connect() { return runtimeOnly('GmailProvider.connect'); },
  async syncTriggeredMessages() { return runtimeOnly('GmailProvider.syncTriggeredMessages'); }
};

export const sheetsProvider: SheetsProvider = {
  async appendContact() { return runtimeOnly('SheetsProvider.appendContact'); },
  async appendIntake() { return runtimeOnly('SheetsProvider.appendIntake'); },
  async readContacts() { return runtimeOnly('SheetsProvider.readContacts'); }
};

export const relationshipAiProvider: RelationshipAiProvider = {
  async summarizeIntake() { return runtimeOnly('RelationshipAiProvider.summarizeIntake'); },
  async draftTouch() { return runtimeOnly('RelationshipAiProvider.draftTouch'); }
};

export const handwrittenNoteProvider: HandwrittenNoteProvider = {
  async createDraft() { return runtimeOnly('HandwrittenNoteProvider.createDraft'); }
};
