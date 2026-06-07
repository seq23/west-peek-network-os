export const canonicalTrigger = '#wpnetwork';
export const acceptedAliases = ['#addtowestpeek', '#westpeeknetwork'];
export const allTriggers = [canonicalTrigger, ...acceptedAliases];

export function containsTrigger(text: string) {
  const lower = text.toLowerCase();
  return allTriggers.some((trigger) => lower.includes(trigger));
}

export function parseFields(text: string) {
  const fields: Record<string, string> = {};
  for (const line of text.split(/\r?\n/)) {
    const match = line.match(/^\s*([^:#]+):\s*(.+?)\s*$/);
    if (match) fields[match[1].trim().toLowerCase()] = match[2].trim();
  }
  return fields;
}
