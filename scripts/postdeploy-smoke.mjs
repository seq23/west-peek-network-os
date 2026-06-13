#!/usr/bin/env node
import { request } from 'node:https';
import { request as httpRequest } from 'node:http';

const base = process.env.POSTDEPLOY_BASE_URL || process.env.SMOKE_BASE_URL || process.env.PLAYWRIGHT_BASE_URL;
if (!base || !/^https?:\/\//.test(base)) {
  console.error('postdeploy-smoke: FAIL — set POSTDEPLOY_BASE_URL/SMOKE_BASE_URL/PLAYWRIGHT_BASE_URL.');
  process.exit(1);
}
const targets = ['/', '/api/oauth/status'];
function fetch(url, headers = {}) {
  return new Promise((resolve, reject) => {
    const lib = url.startsWith('https:') ? request : httpRequest;
    const req = lib(url, { method: 'GET', headers }, (res) => {
      let body = '';
      res.on('data', (chunk) => body += chunk);
      res.on('end', () => resolve({ status: res.statusCode, body }));
    });
    req.on('error', reject);
    req.end();
  });
}
let failed = false;
for (const target of targets) {
  const url = new URL(target, base).toString();
  const headers = target === '/' ? { accept: 'text/html' } : {};
  const res = await fetch(url, headers);
  const ok = target === '/' ? [200, 301, 302, 303, 307, 308, 401].includes(res.status) : [200, 401, 403, 429, 503].includes(res.status);
  console.log(`${target}: ${res.status} ${ok ? 'PASS' : 'FAIL'}`);
  if (!ok || /Cannot read properties|RESOURCE_EXHAUSTED|Quota exceeded|Google Sheets header read failed/i.test(res.body)) failed = true;
}
process.exit(failed ? 1 : 0);
