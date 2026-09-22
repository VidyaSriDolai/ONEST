import { Link } from 'react-router-dom';
import { ArrowLeft, Compass, ShieldCheck } from 'lucide-react';
import { Seo } from '@/components/seo/Seo';
import { Button } from '@/components/ui/Button';

export default function NotFoundPage() {
  return (
    <>
      <Seo
        title="Page not found"
        description="The page you were looking for does not exist."
        path="/404"
        noIndex
      />

      <section className="container-page flex min-h-[60vh] flex-col items-center justify-center py-20 text-center">
        <span className="flex size-16 items-center justify-center rounded-2xl bg-brand-50 text-brand-600">
          <Compass className="size-8" aria-hidden="true" />
        </span>

        <p className="mt-6 font-mono text-sm font-semibold tracking-widest text-brand-600">
          ERROR 404
        </p>
        <h1 className="mt-3 font-display text-3xl font-extrabold tracking-tight sm:text-4xl">
          We could not find that page
        </h1>
        <p className="mt-4 max-w-md text-ink-600">
          The link may be out of date, or the page may have moved. If you were trying to check a
          credential, verification is still one click away.
        </p>

        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          <Link to="/">
            <Button size="lg" fullWidth className="sm:w-auto">
              <ArrowLeft className="size-4" aria-hidden="true" />
              Back to home
            </Button>
          </Link>
          <Link to="/verify">
            <Button size="lg" variant="secondary" fullWidth className="sm:w-auto">
              <ShieldCheck className="size-4" aria-hidden="true" />
              Verify a certificate
            </Button>
          </Link>
        </div>
      </section>
    </>
  );
}
