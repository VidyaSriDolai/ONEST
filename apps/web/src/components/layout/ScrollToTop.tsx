import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

/**
 * A client-side route change does not reset scroll position the way a full
 * page load does. This restores that expectation, while leaving in-page anchor
 * links (/#tracks) to scroll to their target normally.
 */
export function ScrollToTop() {
  const { pathname, hash } = useLocation();

  useEffect(() => {
    if (hash) {
      const target = document.querySelector(hash);
      if (target) {
        target.scrollIntoView({ behavior: 'smooth' });
        return;
      }
    }
    window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior });
  }, [pathname, hash]);

  return null;
}
