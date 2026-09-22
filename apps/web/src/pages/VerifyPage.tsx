import { useEffect, useState, type FormEvent } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Loader2, Search, ShieldCheck } from 'lucide-react';
import {
  BRAND,
  CERTIFICATE_ID_PATTERN,
  normalizeCertificateId,
  type VerificationResponse,
} from '@skillseal/shared';
import { Seo } from '@/components/seo/Seo';
import { Alert } from '@/components/ui/Alert';
import { Button } from '@/components/ui/Button';
import { VerificationResultCard } from '@/features/verification/VerificationResultCard';
import { verificationApi } from '@/features/verification/verification-api';
import { absoluteUrl } from '@/lib/site';

function VerifyForm({
  initialValue,
  onSubmit,
  isBusy,
}: {
  initialValue: string;
  onSubmit: (id: string) => void;
  isBusy: boolean;
}) {
  const [value, setValue] = useState(initialValue);
  const [touched, setTouched] = useState(false);

  useEffect(() => setValue(initialValue), [initialValue]);

  const normalized = normalizeCertificateId(value);
  const isMalformed = touched && value.length > 0 && !CERTIFICATE_ID_PATTERN.test(normalized);

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setTouched(true);
    if (value.trim()) onSubmit(normalized);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3" noValidate>
      <div>
        <label htmlFor="certificate-id" className="block text-sm font-medium text-ink-800">
          Certificate ID
        </label>
        <div className="relative mt-1.5">
          <Search
            className="pointer-events-none absolute left-3.5 top-1/2 size-4.5 -translate-y-1/2 text-ink-400"
            aria-hidden="true"
          />
          <input
            id="certificate-id"
            value={value}
            onChange={(event) => setValue(event.target.value)}
            onBlur={() => setTouched(true)}
            placeholder="SS-2026-4F8A-21D9"
            autoComplete="off"
            autoCapitalize="characters"
            spellCheck={false}
            aria-invalid={isMalformed || undefined}
            aria-describedby={isMalformed ? 'certificate-id-error' : 'certificate-id-hint'}
            className="block w-full rounded-xl border-0 bg-surface py-3 pl-10 pr-3 font-mono text-[15px] uppercase tracking-wide text-ink-900 ring-1 ring-inset ring-ink-200 transition placeholder:font-sans placeholder:normal-case placeholder:tracking-normal placeholder:text-ink-400 focus:ring-2 focus:ring-inset focus:ring-brand-500"
          />
        </div>
        {isMalformed ? (
          <p id="certificate-id-error" className="mt-1.5 text-xs text-danger-600" role="alert">
            That does not look like a certificate ID. The format is SS-2026-4F8A-21D9.
          </p>
        ) : (
          <p id="certificate-id-hint" className="mt-1.5 text-xs text-ink-500">
            Dashes are optional — we will add them for you.
          </p>
        )}
      </div>

      <Button type="submit" size="lg" fullWidth isLoading={isBusy} loadingText="Checking…">
        <ShieldCheck className="size-4" aria-hidden="true" />
        Verify certificate
      </Button>
    </form>
  );
}

/**
 * Public verification (spec screen 4).
 *
 * Serves two routes: /verify with just the form, and /verify/:certificateId
 * which runs the check immediately — that second form is what the QR code on
 * a certificate points at, so it must work with no login and no typing.
 */
export default function VerifyPage() {
  const { certificateId } = useParams<{ certificateId?: string }>();
  const navigate = useNavigate();

  const activeId = certificateId ? normalizeCertificateId(certificateId) : '';

  const { data, isFetching, isError, error } = useQuery<VerificationResponse>({
    queryKey: ['verify', activeId],
    queryFn: () => verificationApi.verifyPublic(activeId),
    enabled: activeId.length > 0,
    // A revoked certificate must never be served from cache.
    staleTime: 0,
    gcTime: 0,
    retry: false,
  });

  const structuredData = {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name: BRAND.name + ' certificate verification',
    applicationCategory: 'BusinessApplication',
    url: absoluteUrl('/verify'),
    description:
      'Check whether a professional certification is valid, expired or revoked. No account required.',
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'INR' },
  };

  return (
    <>
      <Seo
        title={activeId ? 'Verify certificate ' + activeId : 'Verify a certificate'}
        description="Confirm in seconds whether a certification is valid, expired or revoked. Free, and no account needed."
        path={activeId ? '/verify/' + activeId : '/verify'}
        structuredData={structuredData}
        // Individual certificate pages should not be indexed: they carry a
        // named person's credential data.
        noIndex={Boolean(activeId)}
      />

      <div className="bg-ink-50">
        <div className="container-page max-w-3xl py-10 sm:py-14">
          <header className="text-center">
            <span className="inline-flex size-12 items-center justify-center rounded-2xl bg-brand-600 text-white shadow-brand">
              <ShieldCheck className="size-6" aria-hidden="true" />
            </span>
            <h1 className="mt-5 font-display text-3xl font-extrabold tracking-tight sm:text-4xl">
              Verify a certificate
            </h1>
            <p className="mx-auto mt-3 max-w-xl text-ink-600">
              Enter a certificate ID to confirm whether the credential is genuine, still valid, and
              what it certifies. No account needed.
            </p>
          </header>

          <div className="mt-8 rounded-2xl bg-surface p-5 shadow-card ring-1 ring-ink-200 sm:p-6">
            <VerifyForm
              initialValue={activeId}
              isBusy={isFetching}
              onSubmit={(id) => navigate('/verify/' + encodeURIComponent(id))}
            />
          </div>

          <div className="mt-6">
            {isFetching && !data && (
              <div className="flex items-center justify-center gap-3 rounded-2xl bg-surface p-10 text-ink-500 shadow-card ring-1 ring-ink-200">
                <Loader2 className="size-5 animate-spin" aria-hidden="true" />
                <span className="text-sm">Checking the credential register…</span>
              </div>
            )}

            {isError && (
              <Alert tone="error" title="We could not complete the check">
                {error instanceof Error
                  ? error.message
                  : 'Something went wrong. Please try again in a moment.'}
              </Alert>
            )}

            {data && !isFetching && (
              <VerificationResultCard response={data} queriedId={activeId} />
            )}
          </div>

          {!activeId && (
            <p className="mt-8 text-center text-sm text-ink-500">
              Certificates carry a QR code — scanning it opens this page with the ID already filled
              in.
            </p>
          )}
        </div>
      </div>
    </>
  );
}
