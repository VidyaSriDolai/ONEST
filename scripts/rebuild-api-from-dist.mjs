/**
 * One-time recovery: rebuild apps/api/src from apps/api/dist compiled output.
 * Dist JS has no sourcesContent, so this restores STRUCTURE and LOGIC exactly;
 * TypeScript type annotations are re-added by hand afterwards (tsc will tell us
 * where). Run: node scripts/rebuild-api-from-dist.mjs
 */
import { readFileSync, writeFileSync, mkdirSync, readdirSync, statSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const dist = join(root, 'apps/api/dist');
const src = join(root, 'apps/api/src');

function walk(dir, out = []) {
  for (const f of readdirSync(dir)) {
    const p = join(dir, f);
    if (statSync(p).isDirectory()) walk(p, out);
    else if (f.endsWith('.js') && !f.endsWith('.d.js')) out.push(p);
  }
  return out;
}

const files = walk(dist);
for (const file of files) {
  let code = readFileSync(file, 'utf8');
  // Strip the trailing sourcemap comment; everything else is valid ESM.
  code = code.replace(/\/\/# sourceMappingURL=.*\n?$/, '');

  const rel = file.slice(dist.length + 1).replace(/\.js$/, '.ts');
  const out = join(src, rel);
  mkdirSync(dirname(out), { recursive: true });
  writeFileSync(out, code, 'utf8');
  console.log('rebuilt', rel);
}
console.log(`\n${files.length} files written`);
