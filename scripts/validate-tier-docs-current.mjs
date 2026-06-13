#!/usr/bin/env node
import { read, warnOrPass } from './_validation-utils.mjs';
const failures = [];
const docs = ['TIER_VALIDATION_MODEL.md','docs/validation/PROOF_LAYER_DEFINITIONS.md','docs/validation/TIER_4_ULTIMATE_LIVE_PROOF.md'].map((f) => read(f, failures)).join('\n');
if (/Tier 4[^\n]{0,80}(not used|unused)/i.test(docs)) failures.push('Docs still say Tier 4 is unused.');
if (!/Tier 4[\s\S]{0,600}postdeploy only/i.test(docs)) failures.push('Docs must say Tier 4 is postdeploy only.');
if (!/Predeploy[\s\S]{0,600}Tier 4-ready/i.test(docs)) failures.push('Docs must distinguish predeploy readiness from Tier 4 success.');
warnOrPass('validate:tier-docs-current', failures);
