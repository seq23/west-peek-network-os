#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
const root = process.cwd();
const target = path.join(root, '.env.local');
if (fs.existsSync(target)) {
  fs.rmSync(target, { force: true });
  console.log('env-remove: removed .env.local from repo working tree.');
} else {
  console.log('env-remove: .env.local not present.');
}
