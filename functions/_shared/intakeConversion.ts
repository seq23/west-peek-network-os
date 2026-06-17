export function normalizeIntakeTouch(value: unknown) {
  const text = String(value || '').toLowerCase().replace(/[_-]+/g, ' ');
  if (text.includes('handwritten') || text.includes('hand written')) return 'handwritten_note';
  if (text.includes('virtual') && text.includes('thank')) return 'virtual_thank_you_card';
  if (text.includes('thank') && text.includes('card')) return 'virtual_thank_you_card';
  if (text.includes('gift')) return 'gift';
  if (text.includes('intro')) return 'intro';
  if (text.includes('call')) return 'call';
  if (text.includes('meeting')) return 'meeting';
  if (text.includes('event')) return 'event_invite';
  if (text.includes('email') || text.includes('follow')) return 'email';
  return 'undecided';
}

export function shouldCreateTouchFromIntake(intake: Record<string, unknown>) {
  const explicit = String(intake.parsed_needs_touch || intake.needs_touch || '').trim().toLowerCase();
  if (['true', 'yes', 'y', '1', 'needed', 'required'].includes(explicit)) return true;
  if (['false', 'no', 'n', '0', 'not_needed', 'not needed'].includes(explicit)) return false;
  const method = normalizeIntakeTouch(intake.parsed_touch || intake.touch || intake.method);
  if (method && method !== 'undecided') return true;
  return /thank\s*-?\s*you|handwritten|follow\s*-?\s*up|circle back|send|intro|touch/i.test(String(intake.raw_text || intake.parsed_notes || ''));
}
