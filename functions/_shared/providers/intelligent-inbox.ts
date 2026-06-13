export type InboxClassification = {
  capture: boolean;
  category: 'pitch' | 'company_info' | 'relationship' | 'operational' | 'noise';
  score: number;
  reasons: string[];
  triggerIntent: 'deal_flow' | 'relationship';
  personType: 'founder' | 'investor' | 'other';
  dealFlowProspect: 'yes' | 'no';
};

export function classifyIntelligentInbox(headers: Record<string, string>, body: string): InboxClassification {
  const text = `${headers.subject || ''} ${headers.from || ''} ${headers['reply-to'] || ''} ${body}`.toLowerCase();
  const reasons: string[] = [];
  let score = 0;
  const explicitPitch = /\b(pitch|pitch deck|fundrais|raising|seeking (capital|investment)|investment opportunity|venture round|seed round|series [a-f]|pre-seed)\b/.test(text);
  const relationshipSignal = /\b(warm introduction|introduction|connect|meeting|follow up|referral|partnership)\b/.test(text);
  const companySignal = /\b(founder|co-founder|startup|company overview|company update|traction|arr|mrr|revenue|customers|growth|company profile)\b/.test(text);
  const operationalSignal = /\b(password reset|verification code|invoice|receipt|billing|statement|delivery status|undeliverable|calendar invitation|newsletter|unsubscribe|security alert|seo services|lead generation|guest post|sponsorship package|buy now|limited time|cold email software)\b/.test(text);
  const add = (points: number, reason: string, pattern: RegExp) => {
    if (pattern.test(text)) { score += points; reasons.push(reason); }
  };
  add(4, 'explicit pitch/fundraise language', /\b(pitch|pitch deck|fundrais|raising|seeking (capital|investment)|investment opportunity|venture round|seed round|series [a-f]|pre-seed)\b/);
  add(3, 'founder/company introduction', /\b(founder|co-founder|startup|company overview|introduce (my|our) company|building a|we are a)\b/);
  add(2, 'traction/finance metrics', /\b(arr|mrr|revenue|traction|customers|growth|valuation|cap table|runway|term sheet)\b/);
  add(2, 'company materials', /\b(deck|one[- ]pager|executive summary|data room|company profile)\b/);
  add(2, 'investment fit request', /\b(invest|portfolio|check size|thesis|fund|west peek)\b/);
  add(-5, 'automated operational message', /\b(password reset|verification code|invoice|receipt|billing|statement|delivery status|undeliverable|calendar invitation|newsletter|unsubscribe|security alert)\b/);
  add(-4, 'marketing solicitation', /\b(seo services|lead generation|guest post|sponsorship package|buy now|limited time|cold email software)\b/);
  const dealFlow = explicitPitch && score >= 4;
  const relationship = !dealFlow && relationshipSignal && !/\b(company overview|company update|traction|arr|mrr|revenue|fundrais|raising|pitch)\b/.test(text) && score >= 0;
  const companyInfo = !dealFlow && !relationship && companySignal && score >= 2;
  const capture = dealFlow || companyInfo || relationship;
  const category: InboxClassification['category'] = dealFlow ? 'pitch' : companyInfo ? 'company_info' : relationship ? 'relationship' : operationalSignal || score < 0 ? 'operational' : 'noise';
  return {
    capture,
    category,
    score,
    reasons,
    triggerIntent: dealFlow || companyInfo ? 'deal_flow' : 'relationship',
    personType: /\bfounder|co-founder\b/.test(text) ? 'founder' : /\binvestor|family office|venture fund\b/.test(text) ? 'investor' : 'other',
    dealFlowProspect: dealFlow || companyInfo ? 'yes' : 'no'
  };
}
