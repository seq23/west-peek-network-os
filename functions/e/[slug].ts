import { appendRecord, readTab, sheetsUnavailable, type RuntimeEnv } from '../_shared/sheets';
import { ensureSelfSubmittedNetworkProfile } from '../_shared/profileStore';

type Context = { request: Request; env: RuntimeEnv; params: { slug: string } };

const MAX_FIELD = 1000;

export async function onRequestGet({ env, params }: Context) {
  try {
    const event = await findActiveEvent(env, params.slug);
    if (!event) return html(pageShell('Event not available', '<p>This West Peek event form is not available.</p>'), 404);
    return html(renderForm(event));
  } catch (error) {
    if (error instanceof Error && error.message.includes('Google Sheets')) return sheetsUnavailable(error);
    return html(pageShell('Event form unavailable', '<p>The event form is temporarily unavailable.</p>'), 503);
  }
}

export async function onRequestPost({ request, env, params }: Context) {
  try {
    const event = await findActiveEvent(env, params.slug);
    if (!event) return html(pageShell('Event not available', '<p>This West Peek event form is not accepting submissions.</p>'), 404);
    const form = await request.formData();
    if (clean(form.get('website'))) return html(renderThanks(event));
    const publicName = clean(form.get('name')).slice(0, 160);
    const publicEmail = clean(form.get('email')).slice(0, 180);
    const publicCompany = clean(form.get('company')).slice(0, 180);
    const publicTitle = clean(form.get('title')).slice(0, 180);
    const publicPhone = clean(form.get('phone')).slice(0, 80);
    const publicLinkedin = clean(form.get('linkedin')).slice(0, 240);
    const publicInterest = clean(form.get('interest')).slice(0, MAX_FIELD);
    const consent = form.get('consent_follow_up') === 'on';
    if (!publicName || !publicEmail) return html(renderForm(event, 'Name and email are required.'), 400);
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(publicEmail)) return html(renderForm(event, 'Enter a valid email address.'), 400);
    if (!consent) return html(renderForm(event, 'Please confirm West Peek may follow up.'), 400);
    const now = new Date().toISOString();
    const intakeId = `intake_${Date.now()}_${crypto.randomUUID().slice(0, 8)}`;
    const attendee = {
      event_attendee_id: `event_attendee_${Date.now()}_${crypto.randomUUID().slice(0, 8)}`,
      event_id: String(event.event_id), event_name: String(event.event_name), event_slug: String(event.event_slug),
      created_at: now, updated_at: now,
      public_name: publicName, public_email: publicEmail, public_company: publicCompany, public_title: publicTitle, public_phone: publicPhone, public_linkedin: publicLinkedin, public_interest: publicInterest,
      private_context: '', private_voice_transcript: '', ai_summary: publicInterest || 'Public event form submission.', review_status: 'pending_human_review', confidence: 'medium', missing_fields: missingFields(publicName, publicEmail, publicCompany).join(', '),
      source_type: 'event_public_form', created_by: 'public_event_form', source_intake_id: intakeId, consent_follow_up: 'true'
    };
    const profile = await ensureSelfSubmittedNetworkProfile(env, { name: publicName, email: publicEmail, company: publicCompany, website: publicLinkedin, personType: 'general', source: 'event_public_form', captureType: 'event_registration', contextSummary: publicInterest || `Event form submission for ${event.event_name}` });
    const intake = {
      intake_id: intakeId, created_at: now, updated_at: now, source: 'event_public_form', capture_type: 'event_registration', captured_by: 'public_event_form', source_user_email: publicEmail,
      source_file_name: '', source_file_type: '', gmail_message_id: '', gmail_thread_id: '',
      raw_text: [`Event: ${event.event_name}`, `Name: ${publicName}`, `Email: ${publicEmail}`, publicCompany ? `Company: ${publicCompany}` : '', publicTitle ? `Title: ${publicTitle}` : '', publicLinkedin ? `LinkedIn: ${publicLinkedin}` : '', publicInterest ? `Interest: ${publicInterest}` : ''].filter(Boolean).join('\n'),
      email_subject: '', email_from: publicEmail, email_to: '', email_date: '', parsed_name: publicName, parsed_email: publicEmail, parsed_phone: publicPhone, parsed_company: publicCompany, parsed_title: publicTitle, parsed_website: publicLinkedin, parsed_notes: publicInterest,
      extracted_text: '', transcript_text: '', missing_fields: attendee.missing_fields, ai_summary: attendee.ai_summary, ai_confidence: attendee.confidence, internal_data_trace: JSON.stringify([{ stage: 'public_event_form', status: 'passed', detail: 'attendee self-submitted details through public event link' }, { stage: 'database_write', status: 'passed', detail: profile.database_write_status }, { stage: 'execution_guardrail', status: 'passed', detail: 'database intake only; no automatic outreach' }]), human_review_required: 'false', execution_allowed: 'false', review_status: 'event_intake_received', profile_id: profile.profile_id, database_write_status: profile.database_write_status, reviewed_by: '', reviewed_at: '', converted_contact_id: '', attached_contact_id: '', dismiss_reason: '', event_id: attendee.event_id, event_name: attendee.event_name, event_slug: attendee.event_slug
    };
    await appendRecord(env, 'event_attendees', attendee);
    await appendRecord(env, 'intake_queue', intake);
    return html(renderThanks(event));
  } catch (error) {
    if (error instanceof Error && error.message.includes('Google Sheets')) return sheetsUnavailable(error);
    return html(pageShell('Submission unavailable', '<p>The form could not submit right now. Please try again.</p>'), 503);
  }
}

async function findActiveEvent(env: RuntimeEnv, slug: string) {
  const rows = latestById(await readTab(env, 'events'), 'event_id');
  return rows.find((row) => String(row.event_slug) === slug && String(row.status || 'active') === 'active' && String(row.public_form_enabled || 'true') !== 'false');
}
function latestById(rows: Array<Record<string, unknown>>, idKey: string) { const byId = new Map<string, Record<string, unknown>>(); for (const row of rows) { const id = String(row[idKey] || '').trim(); if (!id) continue; const current = byId.get(id); if (!current || timestamp(row.updated_at || row.created_at) >= timestamp(current.updated_at || current.created_at)) byId.set(id, row); } return Array.from(byId.values()); }
function timestamp(value: unknown) { const parsed = Date.parse(String(value || '')); return Number.isFinite(parsed) ? parsed : 0; }
function clean(value: unknown) { return String(value || '').trim(); }
function missingFields(name: string, email: string, company: string) { const missing:string[]=[]; if(!name)missing.push('name'); if(!email)missing.push('email'); if(!company)missing.push('company'); return missing; }
function escapeHtml(value: unknown) { return String(value || '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] || c)); }
function html(body: string, status = 200) { return new Response(body, { status, headers: { 'content-type': 'text/html; charset=utf-8', 'x-robots-tag': 'noindex, nofollow' } }); }
function pageShell(title: string, inner: string) { return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,nofollow"><title>${escapeHtml(title)} | West Peek</title><style>body{margin:0;font-family:Inter,ui-sans-serif,system-ui;background:radial-gradient(circle at top left,rgba(240,90,26,.18),transparent 32%),#080808;color:#f7f0e8}.wrap{max-width:720px;margin:0 auto;padding:36px 20px}.card{background:#151312;border:1px solid #332820;border-radius:28px;padding:28px;box-shadow:0 24px 80px rgba(0,0,0,.28)}.brand{display:flex;align-items:center;gap:12px;color:#f05a1a;font-weight:900;letter-spacing:.08em;text-transform:uppercase;font-size:12px}.brand img{width:44px;height:44px;background:white;border-radius:13px;padding:5px;object-fit:contain}h1{font-size:42px;line-height:1.02;margin:18px 0 10px;letter-spacing:-.04em}label{display:block;margin:14px 0 6px;font-weight:750}input,textarea{width:100%;box-sizing:border-box;border:1px solid #3a3029;background:#0f0f10;color:#fff;border-radius:14px;padding:13px;font:inherit}input:focus,textarea:focus{outline:2px solid rgba(240,90,26,.35);border-color:#f05a1a}button{margin-top:18px;background:#f05a1a;color:#111;border:0;border-radius:999px;padding:13px 18px;font-weight:900}.muted{color:#c5b7ab;line-height:1.55}.error{color:#ffb0a8;font-weight:850}.hp{position:absolute;left:-9999px}</style></head><body><main class="wrap"><section class="card"><div class="brand"><img src="/wp-logo.jpg" alt="West Peek">West Peek Event Capture</div>${inner}</section></main></body></html>`; }
function renderForm(event: Record<string, unknown>, error = '') { return pageShell(String(event.event_name || 'Event'), `<h1>${escapeHtml(event.event_name)}</h1><p class="muted">Share your details with West Peek. This creates a private review item for follow-up; it does not publicly list you anywhere.</p>${error ? `<p class="error">${escapeHtml(error)}</p>` : ''}<form method="post"><div class="hp"><label>Website</label><input name="website" autocomplete="off"></div><label>Name *</label><input name="name" required autocomplete="name"><label>Email *</label><input name="email" type="email" required autocomplete="email"><label>Company</label><input name="company" autocomplete="organization"><label>Title</label><input name="title" autocomplete="organization-title"><label>Phone</label><input name="phone" autocomplete="tel"><label>LinkedIn</label><input name="linkedin" inputmode="url"><label>What should we know?</label><textarea name="interest" rows="4" placeholder="What are you building, investing in, exploring, or hoping to follow up on?"></textarea><label><input type="checkbox" name="consent_follow_up" required style="width:auto;margin-right:8px"> I’m okay with West Peek following up after this event.</label><button type="submit">Submit to West Peek</button></form>`); }
function renderThanks(event: Record<string, unknown>) { return pageShell('Submitted', `<h1>Thanks — you’re in.</h1><p>West Peek received your details for <strong>${escapeHtml(event.event_name)}</strong>.</p><p class="muted">Someone may follow up after the event.</p>`); }
