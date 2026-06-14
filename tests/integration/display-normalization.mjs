import assert from 'node:assert/strict';
import { displayText, clippedText } from '../../src/ui/text.ts';
assert.equal(displayText('<style>x</style><p>Hello &amp; welcome</p><script>bad()</script>'), 'Hello & welcome');
assert.equal(displayText('Founderâ€™s update â€” Q2 Â notes'), 'Founder’s update — Q2 notes');
assert.equal(displayText('&#x1F680; &#39;ok&#39;'), "🚀 'ok'");
assert.match(displayText({ decision_trace: [{ step: 'classify' }] }), /decision_trace/);
assert.equal(clippedText('A'.repeat(500), 20).length, 21);
console.log('display-normalization: PASS');
