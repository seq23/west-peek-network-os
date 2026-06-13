import fs from 'node:fs';
import path from 'node:path';
const dir='tests/fixtures/gmail';
const required=['gmail_pitch_deck_01','gmail_company_update_01','gmail_warm_intro_01','gmail_attachment_pitch_01','gmail_reply_chain_pitch_01','gmail_invoice_01','gmail_password_reset_01','gmail_newsletter_01','gmail_seo_sales_01','gmail_ambiguous_company_01','gmail_malformed_sender_01','gmail_duplicate_01'];
const failures=[];
for (const id of required) {
 const file=path.join(dir,`${id}.json`);
 if(!fs.existsSync(file)){failures.push(`missing ${file}`);continue;}
 const x=JSON.parse(fs.readFileSync(file,'utf8'));
 for(const key of ['fixture_id','mailbox','subject','headers','mime_tree','expected']) if(!(key in x)) failures.push(`${id}: missing ${key}`);
 if(x.fixture_id!==id) failures.push(`${id}: fixture_id mismatch`);
 if(typeof x.expected?.capture!=='boolean') failures.push(`${id}: expected.capture must be boolean`);
 if(!x.expected?.category) failures.push(`${id}: expected.category missing`);
 if(!x.expected?.ingestion_key) failures.push(`${id}: expected.ingestion_key missing`);
}
if(failures.length){console.error(failures.join('\n'));process.exit(1);}
console.log(`PASS canonical Gmail fixture catalog (${required.length} fixtures)`);
