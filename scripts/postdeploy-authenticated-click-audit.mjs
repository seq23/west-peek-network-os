#!/usr/bin/env node
import fs from 'node:fs/promises';
import path from 'node:path';
import { chromium } from '@playwright/test';

const base = process.env.POSTDEPLOY_BASE_URL || process.env.PLAYWRIGHT_BASE_URL;
const state = process.env.PLAYWRIGHT_STORAGE_STATE || '.auth/playwright-storage-state.json';
if (!base || !/^https:\/\//.test(base)) throw new Error('Explicit HTTPS POSTDEPLOY_BASE_URL is required.');
await fs.access(state).catch(() => { throw new Error(`Authenticated storage state missing: ${state}`); });

const runId = process.env.PROOF_RUN_ID || `wpno-auth-audit-${new Date().toISOString().replace(/[-:.]/g, '')}`;
const routeContracts = [
  { label: 'Dashboard', heading: /^Network OS$/ },
  { label: 'Events', heading: /^Create event forms and review attendees$/ },
  { label: 'Add Person', heading: /^Add to West Peek Network$/ },
  { label: 'Capture Studio', heading: /^Add people from cards, screenshots, and voice notes$/ },
  { label: 'Thank-You', heading: /^Create a West Peek branded thank-you$/ },
  { label: 'Intake Queue', heading: /^Review captured relationship context$/ },
  { label: 'West Peek Network', heading: /^People in the West Peek Network$/ },
  { label: 'Touchpoints', heading: /^Intentional follow-through$/ },
  { label: 'Approvals', heading: /^Approvals Needed$/ },
  { label: 'Notifications', heading: /^Calm reminders, not approvals$/ },
  { label: 'AI Helper', heading: /^Ask Claude for a reviewable next step$/ },
  { label: 'App Instructions', heading: /^Capture people the way they actually show up\.$/ },
  { label: 'Settings', heading: /^Connections and operator settings$/ }
];

const out = path.resolve('artifacts/diagnostics', runId, 'authenticated-click-audit');
await fs.mkdir(out, { recursive: true });
const browser = await chromium.launch({ headless: process.env.PLAYWRIGHT_HEADED !== '1' });
const results = [];
let sessionProof = { status: 'UNPROVEN', email: '', error: '' };

try {
  for (const viewport of [{ name: 'desktop', width: 1440, height: 1000 }, { name: 'mobile', width: 390, height: 844 }]) {
    const context = await browser.newContext({ storageState: state, viewport: { width: viewport.width, height: viewport.height } });
    const page = await context.newPage();
    const consoleErrors = [];
    const failedRequests = [];
    page.on('console', (message) => { if (message.type() === 'error') consoleErrors.push(message.text()); });
    page.on('requestfailed', (request) => failedRequests.push({ url: request.url(), failure: request.failure()?.errorText || 'unknown' }));

    const response = await page.goto(base, { waitUntil: 'networkidle' });
    if (!response || response.status() >= 400) throw new Error(`Initial app load failed with HTTP ${response?.status() ?? 'no response'}.`);
    if (/\/auth\/google(?:\?|$)/.test(page.url())) throw new Error('Authenticated storage state was rejected; app redirected to Google OAuth.');

    const sessionResponse = await page.request.get(new URL('/api/session', base).toString());
    const sessionBody = await sessionResponse.json().catch(() => ({}));
    if (!sessionResponse.ok() || sessionBody?.authenticated !== true) {
      throw new Error(`Authenticated session check failed (${sessionResponse.status()}).`);
    }
    sessionProof = { status: 'PASS', email: String(sessionBody.email || ''), error: '' };

    for (const contract of routeContracts) {
      consoleErrors.length = 0;
      failedRequests.length = 0;
      let status = 'PASS';
      let error = '';
      try {
        if (viewport.name === 'mobile') {
          const menu = page.getByRole('button', { name: /^(menu|close menu)$/i });
          if (await menu.isVisible().catch(() => false)) {
            const expanded = await menu.getAttribute('aria-expanded');
            if (expanded !== 'true') await menu.click();
          }
        }
        const nav = page.getByRole('button', { name: new RegExp(`^${escapeRegExp(contract.label)}$`) }).first();
        await nav.click();
        await page.getByRole('heading', { level: 1, name: contract.heading }).waitFor({ state: 'visible' });
        const activeClass = await nav.getAttribute('class');
        if (!String(activeClass || '').split(/\s+/).includes('active')) throw new Error('Navigation control did not enter active state.');
        if (/\/auth\/google(?:\?|$)/.test(page.url())) throw new Error('Route navigation fell back to the authentication wall.');
        await page.screenshot({
          path: path.join(out, `${viewport.name}-${contract.label.toLowerCase().replace(/[^a-z0-9]+/g, '-')}.png`),
          fullPage: true
        });
        if (consoleErrors.length) throw new Error(`Console errors: ${consoleErrors.join(' | ')}`);
        if (failedRequests.length) throw new Error(`Failed requests: ${failedRequests.map((item) => `${item.url} (${item.failure})`).join(' | ')}`);
      } catch (caught) {
        status = 'FAIL';
        error = String(caught instanceof Error ? caught.message : caught);
      }
      results.push({
        route: contract.label,
        viewport: viewport.name,
        status,
        expectedHeading: String(contract.heading),
        finalUrl: page.url(),
        consoleErrors: [...consoleErrors],
        failedRequests: [...failedRequests],
        error
      });
    }

    if (viewport.name === 'desktop') {
      consoleErrors.length = 0;
      failedRequests.length = 0;
      let status = 'PASS';
      let error = '';
      try {
        await page.getByRole('button', { name: /^Settings$/ }).click();
        await page.getByRole('heading', { level: 1, name: /^Connections and operator settings$/ }).waitFor();
        const refresh = page.getByRole('button', { name: /^Refresh from Google Sheets$/ });
        await refresh.click();
        await page.getByRole('status').filter({ hasText: /Refreshed from Google Sheets|Live Google Sheets snapshot loaded/i }).waitFor({ timeout: 15000 });
        const snapshot = await page.request.get(new URL('/api/sheets/snapshot?fresh=1', base).toString(), { headers: { 'cache-control': 'no-cache' } });
        if (!snapshot.ok()) throw new Error(`Fresh snapshot readback failed (${snapshot.status()}).`);
        const body = await snapshot.json().catch(() => ({}));
        if (body?.ok !== true) throw new Error('Fresh snapshot readback did not return ok=true.');
        if (consoleErrors.length) throw new Error(`Console errors: ${consoleErrors.join(' | ')}`);
        if (failedRequests.length) throw new Error(`Failed requests: ${failedRequests.map((item) => `${item.url} (${item.failure})`).join(' | ')}`);
      } catch (caught) {
        status = 'FAIL';
        error = String(caught instanceof Error ? caught.message : caught);
      }
      results.push({
        route: 'Settings',
        control: 'Refresh from Google Sheets',
        viewport: 'desktop',
        status,
        proof: 'SAFE READ-ONLY NETWORK + FRESH SNAPSHOT READBACK',
        finalUrl: page.url(),
        consoleErrors: [...consoleErrors],
        failedRequests: [...failedRequests],
        error
      });
    }
    await context.close();
  }
} finally {
  await browser.close();
}

const failedResults = results.filter((result) => result.status !== 'PASS');
const summary = {
  runId,
  proofLayer: 'TIER 4 — AUTHENTICATED ROUTE-COMPLETE VISUAL/NAVIGATION + SAFE READBACK AUDIT',
  base,
  sessionProof,
  routeCoverage: `${routeContracts.length * 2}/${routeContracts.length * 2}`,
  mutationProof: 'NOT RUN — exact registered proof fixtures and per-entity reversible controls are still required',
  results,
  completionImpact: failedResults.length
    ? 'BLOCKS COMPLETE'
    : 'ROUTE VISUAL/NAVIGATION AND SAFE READBACK PASS; DESTRUCTIVE/REVERSIBLE MUTATION PROOF REMAINS SEPARATE'
};
await fs.writeFile(path.join(out, 'summary.json'), JSON.stringify(summary, null, 2));
console.log(`authenticated-click-audit: ${failedResults.length ? 'FAIL' : 'PASS'} — ${results.length} checks`);
process.exit(failedResults.length ? 1 : 0);

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
