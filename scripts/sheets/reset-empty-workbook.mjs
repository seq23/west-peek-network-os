#!/usr/bin/env node
const base = process.env.POSTDEPLOY_BASE_URL || process.env.PLAYWRIGHT_BASE_URL;
if (!base) throw new Error('Set POSTDEPLOY_BASE_URL or PLAYWRIGHT_BASE_URL.');
console.log('Destructive reset is auth-gated and requires the exact confirmation phrase.');
console.log(JSON.stringify({ endpoint: new URL('/api/admin/sheets/reset', base).href, confirm: 'RESET_EMPTY_WEST_PEEK_NETWORK_WORKBOOK' }, null, 2));
