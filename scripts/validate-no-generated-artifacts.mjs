#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { failOrPass, root } from './_validation-utils.mjs';
const failures = [];
const forbidden = ['reports','test-results','playwright-report','dist','build','coverage','.vite','.cache','.tmp','tsconfig.tsbuildinfo'];
for (const rel of forbidden) if (fs.existsSync(path.join(root, rel))) failures.push(`Generated/runtime artifact must not be present in source snapshot: ${rel}`);
failOrPass('validate:no-generated-artifacts', failures);
