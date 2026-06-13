#!/usr/bin/env node
console.error('BLOCKED — Google Sheets live read/write/readback requires deployed credentials and real provider evidence. Set GOOGLE_SHEETS_LIVE_E2E=1 with WEST_PEEK_E2E_RUN_ID after deployment.');
process.exit(1);
