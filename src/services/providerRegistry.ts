import { ProviderNotConfiguredError, type GmailProvider, type HandwrittenNoteProvider, type RelationshipAiProvider, type SheetsProvider } from './contracts';

export const gmailProvider: GmailProvider = {
  async connect() { throw new ProviderNotConfiguredError('GmailProvider'); },
  async syncTriggeredMessages() { throw new ProviderNotConfiguredError('GmailProvider'); }
};

export const sheetsProvider: SheetsProvider = {
  async appendContact() { throw new ProviderNotConfiguredError('SheetsProvider'); },
  async appendIntake() { throw new ProviderNotConfiguredError('SheetsProvider'); },
  async readContacts() { throw new ProviderNotConfiguredError('SheetsProvider'); }
};

export const relationshipAiProvider: RelationshipAiProvider = {
  async summarizeIntake() { throw new ProviderNotConfiguredError('RelationshipAiProvider'); },
  async draftTouch() { throw new ProviderNotConfiguredError('RelationshipAiProvider'); }
};

export const handwrittenNoteProvider: HandwrittenNoteProvider = {
  async createDraft() { throw new ProviderNotConfiguredError('HandwrittenNoteProvider'); }
};
