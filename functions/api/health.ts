import { json } from '../_shared/json';
import { SITE_FORM_ALLOWED_HOSTS, allowedOrigins, type SiteFormEnv } from '../_shared/siteFormContact';

/**
 * The site-form door is the one path in this app whose failure is invisible
 * from the outside: the three West Peek sites keep answering the visitor
 * `ok:true` on a delivered email even when the sheet write fails, by design —
 * a sheet outage must never cost a submission. That is the right trade and it
 * is exactly what makes a silently unconfigured door dangerous, because nobody
 * on either side sees anything.
 *
 * So health reports the door's readiness, computed from the runtime env rather
 * than asserted in prose: whether the shared secret is present, whether the
 * Sheets service account is configured, and which origins are allowed. A door
 * reporting `ready: false` here is a door that is rejecting or 503-ing every
 * submission the sites send it. The sites' own half of the signal is the
 * `sheet` field they return and log on every submission.
 */
function siteFormIntakeDiagnostics(env: SiteFormEnv) {
  const secretConfigured = String(env.WP_NETWORK_OS_INTAKE_SECRET || '').trim().length >= 16;
  const sheetsConfigured = Boolean(env.GOOGLE_SHEET_ID && env.GOOGLE_SERVICE_ACCOUNT_EMAIL && env.GOOGLE_PRIVATE_KEY);
  return {
    route: '/api/intake/site-form',
    ready: secretConfigured && sheetsConfigured,
    shared_secret_configured: secretConfigured,
    sheets_configured: sheetsConfigured,
    writes_tab: 'contacts',
    allowed_origins: allowedOrigins(env),
    allowed_hosts: [...SITE_FORM_ALLOWED_HOSTS],
    failure_visibility:
      'The West Peek sites answer the visitor ok:true whenever the notification email was delivered, even if this door failed, and report the outcome as `sheet` in their JSON response and in their logs. `ready:false` here means every one of those submissions is currently missing from the contacts tab.'
  };
}

export async function onRequest({ env }: { env: SiteFormEnv }) {
  return json({
    ok: true,
    app: 'west-peek-network-os',
    status: 'baseline-runtime-surfaces-present',
    canonicalTrigger: '#wpnetwork',
    acceptedAliases: ['#addtowestpeek', '#westpeeknetwork'],
    dealFlowTriggers: ['#wpdealflow', '#dealflow'],
    providerRuntime: 'External Google/Gmail/Sheets/Claude/vendor execution requires configured secrets.',
    siteFormIntake: siteFormIntakeDiagnostics(env || ({} as SiteFormEnv))
  });
}
