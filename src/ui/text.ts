const NAMED_ENTITIES: Record<string, string> = {
  nbsp: ' ', amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", '#39': "'",
  ndash: '–', mdash: '—', hellip: '…', rsquo: '’', lsquo: '‘', rdquo: '”', ldquo: '“'
};

function stringifyDisplayValue(value: unknown, fallback = ''): string {
  if (value === null || value === undefined || value === '') return fallback;
  if (typeof value === 'string') return value;
  if (typeof value === 'number' || typeof value === 'boolean' || typeof value === 'bigint') return String(value);
  try { return JSON.stringify(value); } catch { return fallback; }
}

function decodeEntities(text: string): string {
  return text.replace(/&(#x?[0-9a-f]+|[a-z]+);/gi, (full, token: string) => {
    const lowered = token.toLowerCase();
    if (NAMED_ENTITIES[lowered]) return NAMED_ENTITIES[lowered];
    if (lowered.startsWith('#x')) {
      const code = Number.parseInt(lowered.slice(2), 16);
      return Number.isFinite(code) ? String.fromCodePoint(code) : full;
    }
    if (lowered.startsWith('#')) {
      const code = Number.parseInt(lowered.slice(1), 10);
      return Number.isFinite(code) ? String.fromCodePoint(code) : full;
    }
    return full;
  });
}

function repairCommonEncoding(text: string): string {
  return text
    .replace(/â€™/g, '’').replace(/â€œ/g, '“').replace(/â€/g, '”')
    .replace(/â€“/g, '–').replace(/â€”/g, '—').replace(/Â /g, ' ')
    .replace(/\uFFFD{2,}/g, '�');
}

export function displayText(value: unknown, fallback = '') {
  let text = stringifyDisplayValue(value, fallback);
  text = text.replace(/<style[\s\S]*?<\/style>/gi, ' ').replace(/<script[\s\S]*?<\/script>/gi, ' ');
  text = text.replace(/<br\s*\/?\s*>/gi, '\n').replace(/<\/p\s*>/gi, '\n').replace(/<[^>]+>/g, ' ');
  text = decodeEntities(text);
  text = repairCommonEncoding(text);
  text = text.replace(/\r/g, '').replace(/[ \t]+\n/g, '\n').replace(/\n{3,}/g, '\n\n').replace(/[ \t]{2,}/g, ' ').trim();
  return text || fallback;
}

export function clippedText(value: unknown, max = 320, fallback = '') {
  const text = displayText(value, fallback);
  return text.length > max ? `${text.slice(0, max).trim()}…` : text;
}
