/**
 * Copies each app's .env.example to .env on first run, so a fresh clone
 * works with `npm run setup` alone. Never overwrites an existing .env.
 */
import { copyFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

for (const app of ['apps/api', 'apps/web']) {
  const example = join(root, app, '.env.example');
  const target = join(root, app, '.env');
  if (existsSync(target)) {
    console.log(`  ${app}/.env already exists — left untouched`);
  } else if (existsSync(example)) {
    copyFileSync(example, target);
    console.log(`  Created ${app}/.env from .env.example`);
  } else {
    console.warn(`  ${app}: no .env.example found — create .env manually`);
  }
}
console.log('Env files ready.\n');
