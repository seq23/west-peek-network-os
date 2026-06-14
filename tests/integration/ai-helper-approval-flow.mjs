import fs from 'node:fs';
const api=fs.readFileSync('functions/api/ai/suggestions/create.ts','utf8');
const app=fs.readFileSync('src/ui/App.tsx','utf8');
for (const token of ["appendRecord(env, 'ai_suggestions'","appendRecord(env, 'approvals'","appendRecord(env, 'notifications'","source_entity_type: 'ai_suggestion'"]) if(!api.includes(token)) throw new Error(`missing ${token}`);
for (const token of ['AI Helper','Ask Claude for a reviewable next step','onCreated','setPage(\'approvals\')']) if(!app.includes(token)) throw new Error(`missing ${token}`);
console.log('ai-helper approval flow: PASS');
