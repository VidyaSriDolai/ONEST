import { useLayoutEffect } from 'react';
import { BRAND } from '@skillseal/shared';
import { absoluteUrl } from '@/lib/site';

/**
 * Drops the placeholder metadata that index.html ships for non-JS crawlers.
 *
 * React 19 hoists the tags below into <head>, but it does not replace matching
 * static ones — it appends. Without this the document would carry two `robots`
 * and two `canonical` tags, and a crawler reading the first would index /login
 * and treat every page's canonical as "/".
 *
 * Runs in a layout effect so React's own tags are already in the DOM: the
 * defaults are never removed before their replacements exist.
 */
function useStripDefaultMeta(): void {
  useLayoutEffect(() => {
    document.head.querySelectorAll('[data-seo-default]').forEach((node) => node.remove());
  }, []);
}

export interface SeoProps {
  title: string;
  description: string;
  /** Path only, e.g. "/login". Resolved against the configured site origin. */
  path: string;
  /** Private/utility routes should stay out of the index. */
  noIndex?: boolean;
  image?: string;
  /** JSON-LD object graph for this page. */
  structuredData?: Record<string, unknown>;
  /** Appends the brand name to the tab title. */
  appendBrand?: boolean;
}

/**
 * React 19 hoists <title>, <meta> and <link> rendered anywhere in the tree up
 * into <head>, so routes can declare their own metadata without a helmet
 * library. The static tags in index.html act as the fallback for crawlers
 * that do not execute JavaScript.
 */
export function Seo({
  title,
  description,
  path,
  noIndex,
  image,
  structuredData,
  appendBrand = true,
}: SeoProps) {
  useStripDefaultMeta();

  const fullTitle = appendBrand ? title + ' — ' + BRAND.name : title;
  const canonical = absoluteUrl(path);
  const ogImage = absoluteUrl(image ?? '/og-image.png');

  return (
    <>
      <title>{fullTitle}</title>
      <meta name="description" content={description} />
      <link rel="canonical" href={canonical} />
      <meta
        name="robots"
        content={noIndex ? 'noindex, nofollow' : 'index, follow, max-image-preview:large'}
      />

      <meta property="og:type" content="website" />
      <meta property="og:site_name" content={BRAND.name} />
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={description} />
      <meta property="og:url" content={canonical} />
      <meta property="og:image" content={ogImage} />

      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={ogImage} />

      {structuredData && (
        <script type="application/ld+json">{JSON.stringify(structuredData)}</script>
      )}
    </>
  );
}
