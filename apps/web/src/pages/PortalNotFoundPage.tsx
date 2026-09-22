import { Link } from 'react-router-dom';
import { Compass } from 'lucide-react';
import { ROLE_HOME } from '@skillseal/shared';
import { Seo } from '@/components/seo/Seo';
import { Button } from '@/components/ui/Button';
import { useAuth } from '@/features/auth/AuthProvider';

/**
 * 404 for signed-in users, rendered inside the portal shell.
 *
 * The public NotFoundPage would drop a signed-in user onto marketing chrome
 * mid-session, which reads as a bug rather than a missing page.
 */
export default function PortalNotFoundPage() {
  const { user } = useAuth();
  const home = user ? ROLE_HOME[user.role] : '/';

  return (
    <>
      <Seo title="Page not found" description="That page does not exist." path="/404" noIndex />

      <div className="flex min-h-[60vh] flex-col items-center justify-center px-4 py-16 text-center">
        <span className="flex size-14 items-center justify-center rounded-2xl bg-brand-50 text-brand-600">
          <Compass className="size-7" aria-hidden="true" />
        </span>

        <p className="mt-5 font-mono text-xs font-semibold tracking-widest text-brand-600">
          ERROR 404
        </p>
        <h1 className="mt-2 font-display text-2xl font-extrabold tracking-tight sm:text-3xl">
          We could not find that page
        </h1>
        <p className="mt-3 max-w-md text-ink-600">
          The link may be out of date, or the page may have moved. Your session is still active.
        </p>

        <Link to={home} className="mt-7">
          <Button size="lg">Back to your dashboard</Button>
        </Link>
      </div>
    </>
  );
}
