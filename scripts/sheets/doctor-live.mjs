#!/usr/bin/env node
const base = process.env.POSTDEPLOY_BASE_URL || process.env.PLAYWRIGHT_BASE_URL;
if (!base) throw new Error('Set POSTDEPLOY_BASE_URL or PLAYWRIGHT_BASE_URL.');
console.log('Use the authenticated Settings sheet doctor or GET /api/admin/sheets/doctor. This CLI intentionally does not accept raw credentials.');
console.log(JSON.stringify({ endpoint: new URL('/api/admin/sheets/doctor', base).href, mutation_performed: false }, null, 2));
