export type GmailMessageRef = { id: string; threadId?: string };
export type GmailHeader = { name: string; value: string };
export type GmailPart = { mimeType?: string; body?: { data?: string }; parts?: GmailPart[] };
export type GmailMessage = { id: string; threadId?: string; payload?: { headers?: GmailHeader[]; body?: { data?: string }; parts?: GmailPart[] }; snippet?: string; internalDate?: string };
export type MailboxIdentity = { email: string; provider: 'gmail' };
export interface GmailProvider {
  listMessages(input: { query: string; maxResults: number }): Promise<GmailMessageRef[]>;
  getMessage(input: { id: string }): Promise<GmailMessage>;
  getMailboxIdentity(): Promise<MailboxIdentity>;
}
