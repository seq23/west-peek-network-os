export function humanize(value: unknown) {
  if (String(value || '') === 'general_tech_adjacent') return 'General – Tech Adjacent';
  return String(value || '').replaceAll('_', ' ').replace(/\b\w/g, (char) => char.toUpperCase());
}

export function friendlyWhen(value: unknown, fallback = 'Not scheduled') {
  const date = new Date(String(value || ''));
  if (Number.isNaN(date.getTime())) return String(value || fallback);
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: date.getFullYear() !== new Date().getFullYear() ? 'numeric' : undefined });
}

export function relativeWhen(value: unknown) {
  const date = new Date(String(value || ''));
  if (Number.isNaN(date.getTime())) return '';
  const days = Math.floor((Date.now() - date.getTime()) / 86400000);
  if (days <= 0) return 'Today';
  if (days === 1) return 'Yesterday';
  if (days < 7) return `${days} days ago`;
  return friendlyWhen(value);
}
