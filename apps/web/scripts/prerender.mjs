/**
 * Emits a static index.html per public route at build time, so crawlers that
 * do not execute JavaScript still get the right title/canonical instead of the
 * landing page's. Only the <head> differs per route — bodies render client-side.
 *
 * Run after `vite build`. Reads dist/index.html (the built landing page) and
 * derives the other routes from it.
 */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const dist = join(root, 'dist');

// VITE_SITE_URL drives canonical/og URLs; default matches .env.example.
const siteUrl = (process.env.VITE_SITE_URL || 'https://skillseal.example.org').replace(/\/$/, '');

const LANDING = {
  title: 'SkillSeal — Verifiable corporate certifications on ONEST',
  description:
    'An ONEST-compliant certification platform for corporate training providers. Enroll learners, run assessments, issue tamper-evident certificates, and let any employer verify them in seconds.',
  ogDescription:
    'Issue industry-recognised certifications that any employer can verify in seconds. Built on the ONEST open network.',
};

const routes = [
  { path: '/', ...LANDING },
  {
    path: '/verify',
    title: 'Verify a certificate — SkillSeal',
    description:
      'Confirm in seconds whether a professional certification is valid, expired or revoked. Free, and no account needed.',
    ogDescription:
      'Confirm in seconds whether a professional certification is valid, expired or revoked. Free, and no account needed.',
  },
];

const template = readFileSync(join(dist, 'index.html'), 'utf8');

for (const route of routes) {
  const url = siteUrl + (route.path === '/' ? '/' : route.path);
  const html = template
    .replaceAll(LANDING.title, route.title)
    .replaceAll(LANDING.description, route.description)
    .replaceAll(LANDING.ogDescription, route.ogDescription)
    // Only the canonical link and og:url carry the route URL — og:image etc.
    // share the site prefix and must stay untouched.
    .replace(/(<link data-seo-default rel="canonical" href=")[^"]*(")/, `$1${url}$2`)
    .replace(/(<meta data-seo-default property="og:url" content=")[^"]*(")/, `$1${url}$2`);

  const outFile = join(dist, route.path, 'index.html');
  mkdirSync(dirname(outFile), { recursive: true });
  writeFileSync(outFile, html, 'utf8');
  console.log(`prerender: wrote ${route.path === '/' ? './' : route.path + '/'}index.html`);
}
