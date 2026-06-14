const base = process.env.POSTDEPLOY_BASE_URL || process.env.SMOKE_BASE_URL;
if (!base) {
  console.error('POSTDEPLOY_BASE_URL or SMOKE_BASE_URL is required.');
  process.exit(1);
}
console.log(JSON.stringify({
  migration: 'empty_workbook_to_schema_v1',
  endpoint: new URL('/api/admin/sheets/reset', base).href,
  target_schema_version: 1,
  confirm: 'RESET_EMPTY_WEST_PEEK_NETWORK_WORKBOOK',
  warning: 'This is the only admitted schema migration for the unused workbook. It physically clears governed tabs before writing schema v1.'
}, null, 2));
