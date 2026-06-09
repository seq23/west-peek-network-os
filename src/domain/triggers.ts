export const CANONICAL_GMAIL_TRIGGER = '#wpnetwork';
export const ACCEPTED_GMAIL_TRIGGER_ALIASES = ['#addtowestpeek', '#westpeeknetwork'] as const;

export const CANONICAL_DEALFLOW_TRIGGER = '#wpdealflow';
export const ACCEPTED_DEALFLOW_TRIGGER_ALIASES = ['#dealflow'] as const;

export const ALL_NETWORK_GMAIL_TRIGGERS = [CANONICAL_GMAIL_TRIGGER, ...ACCEPTED_GMAIL_TRIGGER_ALIASES] as const;
export const ALL_DEALFLOW_GMAIL_TRIGGERS = [CANONICAL_DEALFLOW_TRIGGER, ...ACCEPTED_DEALFLOW_TRIGGER_ALIASES] as const;
export const ALL_GMAIL_TRIGGERS = [...ALL_NETWORK_GMAIL_TRIGGERS, ...ALL_DEALFLOW_GMAIL_TRIGGERS] as const;

export type GmailTrigger = typeof ALL_GMAIL_TRIGGERS[number];
export type TriggerIntent = 'network' | 'deal_flow';

export function containsWestPeekTrigger(text: string) {
  const normalized = text.toLowerCase();
  return ALL_GMAIL_TRIGGERS.some((trigger) => normalized.includes(trigger));
}

export function detectSourceTrigger(text: string): GmailTrigger | undefined {
  const normalized = text.toLowerCase();
  return ALL_GMAIL_TRIGGERS.find((trigger) => normalized.includes(trigger));
}

export function detectTriggerIntent(text: string): TriggerIntent {
  const normalized = text.toLowerCase();
  return ALL_DEALFLOW_GMAIL_TRIGGERS.some((trigger) => normalized.includes(trigger)) ? 'deal_flow' : 'network';
}
