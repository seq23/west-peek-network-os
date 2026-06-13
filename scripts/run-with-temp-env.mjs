#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const root = process.cwd();
const packagePath = path.join(root, 'package.json');
const args = process.argv.slice(2);

function usage() {
  console.log(`run-with-temp-env

Restores .env.local from the repo-approved encrypted/local vault only for the duration of a command, then removes it again if this wrapper created it.

Usage:
  node scripts/run-with-temp-env.mjs [--keep-env] [--allow-existing] [--restore-script <npm-script>] [--remove-script <npm-script>] -- <command...>

Examples:
  node scripts/run-with-temp-env.mjs -- npm run test:everything
  node scripts/run-with-temp-env.mjs -- npm run test:everything:tier3

Safety:
  - Never prints secret values.
  - Refuses to overwrite an existing .env.local unless --allow-existing is provided.
  - Removes .env.local only if this wrapper created it.
  - If the restore step fails, the target command is not run.`);
}

let keepEnv = false;
let allowExisting = false;
let restoreScript = null;
let removeScript = null;
let commandStart = args.indexOf('--');

for (let i = 0; i < (commandStart === -1 ? args.length : commandStart); i += 1) {
  const arg = args[i];
  if (arg === '--help' || arg === '-h') { usage(); process.exit(0); }
  if (arg === '--keep-env') { keepEnv = true; continue; }
  if (arg === '--allow-existing') { allowExisting = true; continue; }
  if (arg === '--restore-script') { restoreScript = args[++i]; continue; }
  if (arg === '--remove-script') { removeScript = args[++i]; continue; }
  console.error(`Unknown argument before --: ${arg}`);
  usage();
  process.exit(2);
}

if (commandStart === -1 || commandStart === args.length - 1) {
  console.error('Missing command after --.');
  usage();
  process.exit(2);
}

if (!fs.existsSync(packagePath)) {
  console.error('package.json not found. Run this from the repo root.');
  process.exit(2);
}

const pkg = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
const scripts = pkg.scripts || {};
const envPath = path.join(root, '.env.local');
const command = args.slice(commandStart + 1);
const existingBefore = fs.existsSync(envPath);

function firstExistingScript(candidates) {
  return candidates.find((candidate) => Boolean(scripts[candidate])) || null;
}

restoreScript ||= firstExistingScript([
  'env:restore:force',
  'env:restore',
  'env:local:from-vault:force',
  'env:local:from-vault',
  'env:create-local:force',
  'env:create-local'
]);
removeScript ||= firstExistingScript([
  'env:remove',
  'env:local:remove'
]);

if (existingBefore && !allowExisting) {
  console.error('.env.local already exists. This wrapper will not overwrite or delete an existing local env by default.');
  console.error('Either remove it first with npm run env:remove, or rerun with --allow-existing if intentional.');
  process.exit(1);
}

let createdByWrapper = false;
let commandStatus = 1;

function runNpmScript(scriptName) {
  if (!scriptName || !scripts[scriptName]) {
    console.error(`Required npm script not found: ${scriptName || '(none detected)'}`);
    process.exit(1);
  }
  console.log(`[env-wrapper] running npm script: ${scriptName}`);
  const result = spawnSync('npm', ['run', scriptName], { cwd: root, stdio: 'inherit', env: process.env });
  if (result.status !== 0) {
    console.error(`[env-wrapper] npm script failed: ${scriptName}`);
    process.exit(result.status ?? 1);
  }
}

function runCommand(command) {
  console.log(`[env-wrapper] running command with temporary .env.local: ${command.join(' ')}`);
  const result = spawnSync(command[0], command.slice(1), { cwd: root, stdio: 'inherit', env: process.env, shell: process.platform === 'win32' });
  return result.status ?? 1;
}

try {
  if (!existingBefore) {
    runNpmScript(restoreScript);
    if (!fs.existsSync(envPath)) {
      console.error('[env-wrapper] restore script completed but .env.local was not created.');
      process.exit(1);
    }
    createdByWrapper = true;
    console.log('[env-wrapper] .env.local restored for this command. Secret values were not printed.');
  } else {
    console.log('[env-wrapper] using existing .env.local because --allow-existing was provided. It will not be removed by this wrapper.');
  }

  commandStatus = runCommand(command);
} finally {
  if (createdByWrapper && !keepEnv) {
    if (removeScript && scripts[removeScript]) {
      const result = spawnSync('npm', ['run', removeScript], { cwd: root, stdio: 'inherit', env: process.env });
      if (result.status !== 0) {
        console.error(`[env-wrapper] cleanup script failed: ${removeScript}. Remove .env.local manually before committing.`);
        commandStatus = commandStatus || result.status || 1;
      }
    } else if (fs.existsSync(envPath)) {
      fs.rmSync(envPath, { force: true });
      console.log('[env-wrapper] removed .env.local created by wrapper.');
    }
  } else if (createdByWrapper && keepEnv) {
    console.log('[env-wrapper] --keep-env set; .env.local remains in working tree. Do not commit it.');
  }
}

process.exit(commandStatus);
