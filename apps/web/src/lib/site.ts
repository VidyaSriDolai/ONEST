import { BRAND } from '@skillseal/shared';

/**
 * Canonical origin for SEO tags. Set VITE_SITE_URL per environment so preview
 * deploys do not advertise themselves as the production site.
 */
const SITE_URL: string = import.meta.env.VITE_SITE_URL || BRAND.url;

export function absoluteUrl(path: string): string {
  return new URL(path, SITE_URL).toString();
}
