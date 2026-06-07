import { json } from '../_shared/json';

export async function onRequest() {
  return json({
    ok: true,
    app: 'west-peek-network-os',
    status: 'baseline-runtime-surfaces-present',
    canonicalTrigger: '#wpnetwork',
    acceptedAliases: ['#addtowestpeek', '#westpeeknetwork'],
    providerRuntime: 'External Google/Gmail/Sheets/Claude/vendor execution requires configured secrets.'
  });
}
