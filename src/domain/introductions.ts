import type { IntroductionRecord } from './types';
/** Opens Gmail/mail client for an already approved introduction. The app does not infer that mail was sent. */
export function buildMailto(intro: IntroductionRecord) {
  if (intro.status !== 'approved') throw new Error('An approved draft is required before opening an email.');
  const ask = intro.etiquette === 'ask_first';
  const recipients=ask?[intro.person_b_email]:[intro.person_a_email,intro.person_b_email];
  if (recipients.some((email)=>!email||/[\r\n,;]/.test(email))) throw new Error('Recipient email is invalid.');
  const subject=ask?intro.ask_first_subject:intro.draft_subject;
  const body=ask?intro.ask_first_body:intro.draft_body;
  if (!subject||!body) throw new Error('Approved subject and body are required.');
  return `mailto:${recipients.join(',')}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}
