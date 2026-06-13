import type { GmailMessage, GmailMessageRef, GmailProvider, MailboxIdentity } from './gmail';

export type GmailFixtureFailure = 'timeout' | 'permission' | 'rate-limit';
export type GmailFixtureRecord = GmailMessage & { failure?: GmailFixtureFailure };

export class FixtureGmailProvider implements GmailProvider {
  private readonly records: Map<string, GmailFixtureRecord>;
  private readonly mailbox: MailboxIdentity;

  constructor(
    records: GmailFixtureRecord[],
    mailbox: MailboxIdentity = { email: 'fixture@westpeek.test', provider: 'gmail' }
  ) {
    this.mailbox = mailbox;
    this.records = new Map(records.map((record) => [record.id, structuredClone(record)]));
  }

  async listMessages(input: { query: string; maxResults: number }): Promise<GmailMessageRef[]> {
    void input.query;
    return [...this.records.values()].slice(0, input.maxResults).map(({ id, threadId }) => ({ id, threadId }));
  }

  async getMessage(input: { id: string }): Promise<GmailMessage> {
    const record = this.records.get(input.id);
    if (!record) throw new Error(`Fixture Gmail message not found: ${input.id}`);
    if (record.failure === 'timeout') throw new Error('GMAIL_FIXTURE_TIMEOUT');
    if (record.failure === 'permission') throw new Error('GMAIL_FIXTURE_PERMISSION_DENIED');
    if (record.failure === 'rate-limit') throw new Error('GMAIL_FIXTURE_RATE_LIMIT');
    const { failure: _failure, ...message } = structuredClone(record);
    return message;
  }

  async getMailboxIdentity(): Promise<MailboxIdentity> {
    return structuredClone(this.mailbox);
  }
}
