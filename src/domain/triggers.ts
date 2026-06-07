export const CANONICAL_GMAIL_TRIGGER = '#wpnetwork';
export const ACCEPTED_GMAIL_TRIGGER_ALIASES = ['#addtowestpeek', '#westpeeknetwork'] as const;
export const ALL_GMAIL_TRIGGERS = [CANONICAL_GMAIL_TRIGGER, ...ACCEPTED_GMAIL_TRIGGER_ALIASES] as const;

export function containsWestPeekTrigger(text: string): boolean {
  const normalized = text.toLowerCase();
  return ALL_GMAIL_TRIGGERS.some((trigger) => normalized.includes(trigger));
}
