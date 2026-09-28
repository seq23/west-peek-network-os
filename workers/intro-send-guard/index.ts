/** One-use send claims. Never expire a claim: an ambiguous provider response may have sent the mail. */
export class IntroSendGuard {
  private state: DurableObjectState;
  constructor(state: DurableObjectState) { this.state = state; }
  async fetch(request: Request): Promise<Response> {
    if (request.method !== 'POST') return new Response('Method not allowed', { status: 405 });
    const { action, fingerprint, result } = await request.json() as { action: string; fingerprint: string; result?: unknown };
    if (!fingerprint || fingerprint.length !== 64) return new Response('Invalid claim', { status: 400 });
    const existing = await this.state.storage.get<{ fingerprint: string; result?: unknown }>('claim');
    if (action === 'claim') {
      if (existing) return Response.json({ claimed: false, result: existing.result || null }, { status: 409 });
      await this.state.storage.put('claim', { fingerprint });
      return Response.json({ claimed: true });
    }
    if (action === 'complete' && existing?.fingerprint === fingerprint && !existing.result) {
      await this.state.storage.put('claim', { fingerprint, result });
      return Response.json({ complete: true });
    }
    return new Response('Claim conflict', { status: 409 });
  }
}
export default { fetch() { return new Response('Guard only accepts bound requests.', { status: 404 }); } };
