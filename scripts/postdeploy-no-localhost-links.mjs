#!/usr/bin/env node
import { request } from 'node:https';
import { request as httpRequest } from 'node:http';
const label = 'postdeploy:no-localhost-links';
const base = process.env.POSTDEPLOY_BASE_URL || process.env.SMOKE_BASE_URL || process.env.PLAYWRIGHT_BASE_URL;
if (!base || !/^https?:\/\//.test(base)) { console.error(`${label}: FAIL — explicit deployed base URL required.`); process.exit(1); }
const targets = ["/"];
function fetchUrl(url, method = 'GET') {
  return new Promise((resolve, reject) => {
    const lib = url.startsWith('https:') ? request : httpRequest;
    const req = lib(url, { method }, (res) => { let body=''; res.on('data', c => body += c); res.on('end', () => resolve({ status: res.statusCode || 0, body, headers: res.headers })); });
    req.on('error', reject); req.end();
  });
}
let failed = false;
for (const target of targets) {
  const url = new URL(target, base).toString();
  const method = target.includes('/api/intake/pitch-lab') ? 'POST' : 'GET';
  const res = await fetchUrl(url, method).catch((error) => ({ status: 0, body: String(error), headers: {} }));
  const safeStatus = [200,201,204,302,303,307,308,400,401,403,404,405,409,422,429,503].includes(res.status);
  const rawCrash = /atob\(\) called|Cannot read properties|ReferenceError|TypeError|BEGIN PRIVATE KEY|sk-ant-|ya29\.|localhost:5173/i.test(res.body);
  const localhostLeak = /localhost:\d+|127\.0\.0\.1:\d+/.test(res.body);
  const ok = safeStatus && !rawCrash && (label !== 'postdeploy:no-localhost-links' || !localhostLeak);
  console.log(`${target}: ${res.status} ${ok ? 'PASS' : 'FAIL'}`);
  if (!ok) failed = true;
}
process.exit(failed ? 1 : 0);
