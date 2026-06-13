#!/usr/bin/env node
import { listFiles, read, failOrPass } from './_validation-utils.mjs';
const failures = [];
const targets = listFiles().filter((f) => /^(scripts|tests|functions)\//.test(f) && /\.(mjs|ts|tsx|js)$/.test(f));
for (const file of targets) {
  const text = read(file);
  if (/POSTDEPLOY_BASE_URL\s*\|\|\s*['"]http:\/\/localhost/.test(text) || /PLAYWRIGHT_BASE_URL\s*\|\|\s*['"]http:\/\/localhost/.test(text)) failures.push(`${file} has localhost default for deployed proof.`);
}
failOrPass('validate:no-localhost-defaults', failures);
