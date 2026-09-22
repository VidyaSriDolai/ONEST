/**
 * One-time recovery: restore web sources from Vite sourcemaps' sourcesContent.
 * Run: node scripts/recover-from-maps.mjs
 */
import { readFileSync, writeFileSync, mkdirSync, readdirSync, statSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const dist = join(root, 'apps/web/dist');

function walk(dir, out = []) {
  for (const f of readdirSync(dir)) {
    const p = join(dir, f);
    if (statSync(p).isDirectory()) walk(p, out);
    else if (f.endsWith('.js.map')) out.push(p);
  }
  return out;
}

const restored = new Map();
let skippedNodeModules = 0;

for (const mapPath of walk(join(dist, 'assets'))) {
  let map;
  try {
    map = JSON.parse(readFileSync(mapPath, 'utf8'));
  } catch {
    continue;
  }
  const { sources = [], sourcesContent = [] } = map;
  sources.forEach((src, i) => {
    const content = sourcesContent[i];
    if (!src || !content) return;
    if (src.includes('node_modules')) {
      skippedNodeModules++;
      return;
    }
    // Resolve the source path relative to the map's own directory
    const abs = resolve(dirname(mapPath), src);
    if (!abs.includes(`${root}\\apps\\web\\src`) && !abs.includes(`${root}\\packages\\shared\\src`)) return;
    if (!restored.has(abs)) restored.set(abs, content);
  });
}

for (const [abs, content] of restored) {
  mkdirSync(dirname(abs), { recursive: true });
  writeFileSync(abs, content, 'utf8');
  console.log('restored', abs.slice(root.length + 1));
}

console.log(`\n${restored.size} files restored, ${skippedNodeModules} node_modules sources skipped`);
