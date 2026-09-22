import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  ArrowLeft,
  BadgeCheck,
  Check,
  Copy,
  Loader2,
  Printer,
  Share2,
  ShieldAlert,
  ShieldCheck,
} from 'lucide-react';
import { BRAND } from '@skillseal/shared';
import { Seo } from '@/components/seo/Seo';
import { Alert } from '@/components/ui/Alert';
import { Button } from '@/components/ui/Button';
import { ApiError, api } from '@/lib/api-client';
import { cn } from '@/lib/cn';
import { QrCode } from './QrCode';

interface CertificateDetail {
  id: string;
  certificateId: string;
  holderName: string;
  trackName: string;
  trackDescription: string;
  issuerName: string;
  nsqfLevel: number | null;
  skills: string[];
  score: number | null;
  status: 'ISSUED' | 'REVOKED';
  isExpired: boolean;
  issuedAt: string;
  expiresAt: string | null;
  revokedAt: string | null;
  revokedReason: string | null;
  onestStatus: 'PENDING' | 'PUBLISHED' | 'FAILED';
  signatureValid: boolean;
  verificationUrl: string;
}

function formatDate(iso: string | null): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

/** Copy-to-clipboard that degrades gracefully where the API is unavailable. */
function useCopy(): [boolean, (text: string) => void] {
  const [copied, setCopied] = useState(false);

  function copy(text: string) {
    const done = () => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    };

    if (navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(text).then(done).catch(() => undefined);
      return;
    }

    // Older browsers, and any non-secure origin.
    const field = document.createElement('textarea');
    field.value = text;
    field.setAttribute('readonly', '');
    field.style.position = 'fixed';
    field.style.opacity = '0';
    document.body.appendChild(field);
    field.select();
    try {
      document.execCommand('copy');
      done();
    } finally {
      document.body.removeChild(field);
    }
  }

  return [copied, copy];
}

/**
 * The certificate artwork (spec screen 12).
 *
 * Landscape, and laid out so the browser's own print-to-PDF produces a clean
 * A4 landscape sheet — see the `print:` utilities and the @media print rules
 * in styles/index.css. That is a deliberate choice over a server-side PDF
 * pipeline: it works today, needs no headless browser in the deploy, and the
 * output is the same artwork the learner sees on screen.
 */
function CertificateArtwork({ certificate }: { certificate: CertificateDetail }) {
  const isRevoked = certificate.status === 'REVOKED';

  return (
    <div
      id="certificate-artwork"
      className="relative aspect-[1.414/1] w-full overflow-hidden rounded-2xl bg-surface shadow-lifted ring-1 ring-ink-200 print:aspect-auto print:h-[19cm] print:rounded-none print:shadow-none print:ring-0"
    >
      {/* Border treatment */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 rounded-2xl ring-[6px] ring-inset ring-brand-950 print:rounded-none"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-[10px] rounded-xl ring-1 ring-inset ring-accent-400/60 print:rounded-none"
      />
      {/* Soft corner wash. Kept faint so it never competes with the
          certificate ID printed over it. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -right-28 -top-28 size-64 rounded-full bg-brand-50/50 blur-2xl print:hidden"
      />

      {/* Revoked watermark, per the spec's diagonal overlay. */}
      {isRevoked && (
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center overflow-hidden"
        >
          <span className="-rotate-[24deg] select-none whitespace-nowrap font-display text-[clamp(3rem,13vw,9rem)] font-extrabold uppercase tracking-[0.12em] text-danger-600/20">
            Revoked
          </span>
        </div>
      )}

      <div className="relative z-10 flex h-full flex-col px-[5%] py-[4%]">
        {/* Header */}
        <header className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <svg viewBox="0 0 32 32" className="size-7 shrink-0" aria-hidden="true">
              <path
                d="M16 2.5 27.5 7v9.2c0 6.4-4.6 11.6-11.5 13.3C9.1 27.8 4.5 22.6 4.5 16.2V7L16 2.5Z"
                fill="#3730a3"
              />
              <path
                d="m10.8 16.4 3.6 3.6 6.8-7.2"
                fill="none"
                stroke="#fff"
                strokeWidth="2.6"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            <span className="font-display text-base font-extrabold text-ink-900">
              {BRAND.name}
            </span>
          </div>

          <div className="text-right">
            <p className="text-[9px] font-semibold uppercase tracking-[0.2em] text-ink-600">
              Certificate ID
            </p>
            <p className="font-mono text-[11px] font-medium tracking-wide text-ink-700">
              {certificate.certificateId}
            </p>
          </div>
        </header>

        {/* Body */}
        <div className="flex flex-1 flex-col items-center justify-center text-center">
          <p className="text-[10px] font-semibold uppercase tracking-[0.3em] text-accent-700">
            Certificate of Completion
          </p>
          <p className="mt-[3%] text-xs text-ink-500">This is to certify that</p>
          <h1 className="mt-[1.5%] font-display text-[clamp(1.4rem,4.2vw,2.6rem)] font-extrabold leading-tight text-ink-900">
            {certificate.holderName}
          </h1>
          <p className="mt-[2.5%] max-w-[80%] text-xs text-ink-500">
            has successfully completed all requirements for
          </p>
          <h2 className="mt-[1.5%] font-display text-[clamp(1rem,2.8vw,1.75rem)] font-bold text-brand-700">
            {certificate.trackName}
          </h2>

          <div className="mt-[2.5%] flex flex-wrap items-center justify-center gap-1.5">
            {certificate.nsqfLevel !== null && (
              <span className="rounded-full bg-ink-100 px-2.5 py-1 text-[10px] font-medium text-ink-600">
                NSQF Level {certificate.nsqfLevel}
              </span>
            )}
            {certificate.score !== null && (
              <span className="rounded-full bg-ink-100 px-2.5 py-1 text-[10px] font-medium text-ink-600">
                Score {certificate.score}%
              </span>
            )}
            {certificate.skills.slice(0, 5).map((skill) => (
              <span
                key={skill}
                className="rounded-full bg-brand-50 px-2.5 py-1 text-[10px] font-medium text-brand-700"
              >
                {skill}
              </span>
            ))}
          </div>
        </div>

        {/* Footer */}
        <footer className="flex items-end justify-between gap-4">
          <div className="text-left">
            <p className="border-t border-ink-300 pt-1.5 text-[10px] font-semibold text-ink-800">
              {certificate.issuerName}
            </p>
            <p className="text-[9px] text-ink-500">Issuing organisation</p>
          </div>

          <div className="flex flex-col items-center">
            <QrCode
              value={certificate.verificationUrl}
              size={62}
              label={'QR code to verify certificate ' + certificate.certificateId}
            />
            <p className="mt-1 text-[8px] text-ink-500">Scan to verify</p>
          </div>

          <div className="text-right">
            <p className="border-t border-ink-300 pt-1.5 text-[10px] font-semibold text-ink-800">
              {formatDate(certificate.issuedAt)}
            </p>
            <p className="text-[9px] text-ink-500">
              {certificate.expiresAt ? 'Valid to ' + formatDate(certificate.expiresAt) : 'No expiry'}
            </p>
          </div>
        </footer>
      </div>
    </div>
  );
}

export default function CertificatePage() {
  const { certificateId } = useParams<{ certificateId: string }>();
  const [copied, copy] = useCopy();
  const [shareNote, setShareNote] = useState<string | null>(null);

  const { data, isPending, isError, error } = useQuery<CertificateDetail>({
    queryKey: ['certificate', certificateId],
    queryFn: () => api.get<CertificateDetail>('/api/student/certificates/' + certificateId),
    enabled: Boolean(certificateId),
    retry: false,
  });

  async function handleShare() {
    if (!data) return;
    const shareData = {
      title: data.trackName + ' — ' + BRAND.name,
      text: data.holderName + ' is certified in ' + data.trackName + '.',
      url: data.verificationUrl,
    };

    // Web Share is the right experience on mobile; elsewhere copying the link
    // is the honest fallback rather than a share sheet that does nothing.
    if (navigator.share) {
      try {
        await navigator.share(shareData);
        return;
      } catch {
        // Cancelled, or blocked — fall through to copying.
      }
    }
    copy(data.verificationUrl);
    setShareNote('Verification link copied — paste it anywhere.');
    setTimeout(() => setShareNote(null), 3000);
  }

  if (isPending) {
    return (
      <div className="container-page flex min-h-[50vh] items-center justify-center">
        <Loader2 className="size-6 animate-spin text-ink-400" aria-hidden="true" />
        <span className="sr-only">Loading certificate…</span>
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="container-page max-w-2xl py-12">
        <Alert tone="error" title="We could not load that certificate">
          {error instanceof ApiError
            ? error.message
            : 'Something went wrong. Please try again in a moment.'}
        </Alert>
        <Link to="/student/dashboard" className="mt-5 inline-block">
          <Button variant="secondary">
            <ArrowLeft className="size-4" aria-hidden="true" />
            Back to dashboard
          </Button>
        </Link>
      </div>
    );
  }

  const isRevoked = data.status === 'REVOKED';

  return (
    <>
      <Seo
        title={data.trackName + ' certificate'}
        description={'Certificate issued to ' + data.holderName + ' by ' + data.issuerName + '.'}
        path={'/student/certificates/' + data.certificateId}
        noIndex
      />

      <div className="container-page max-w-4xl py-8 sm:py-10">
        {/* Everything except the artwork is hidden when printing. */}
        <div className="print:hidden">
          <Link
            to="/student/dashboard"
            className="inline-flex items-center gap-1.5 rounded text-sm font-medium text-ink-500 transition hover:text-ink-900"
          >
            <ArrowLeft className="size-4" aria-hidden="true" />
            Back to dashboard
          </Link>

          <div className="mt-4 flex flex-wrap items-start justify-between gap-4">
            <div>
              <h1 className="font-display text-2xl font-extrabold tracking-tight sm:text-3xl">
                {data.trackName}
              </h1>
              <p className="mt-1 text-ink-600">
                Issued by {data.issuerName} on {formatDate(data.issuedAt)}
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              {isRevoked ? (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-danger-50 px-3 py-1.5 text-xs font-semibold text-danger-700 ring-1 ring-inset ring-danger-100">
                  <ShieldAlert className="size-3.5" aria-hidden="true" />
                  Revoked
                </span>
              ) : data.isExpired ? (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-warn-50 px-3 py-1.5 text-xs font-semibold text-accent-700 ring-1 ring-inset ring-accent-100">
                  Expired
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-valid-50 px-3 py-1.5 text-xs font-semibold text-valid-700 ring-1 ring-inset ring-valid-100">
                  <ShieldCheck className="size-3.5" aria-hidden="true" />
                  Active
                </span>
              )}

              {data.onestStatus === 'PUBLISHED' && (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-brand-50 px-3 py-1.5 text-xs font-semibold text-brand-700 ring-1 ring-inset ring-brand-100">
                  <BadgeCheck className="size-3.5" aria-hidden="true" />
                  Published to ONEST
                </span>
              )}
            </div>
          </div>

          {isRevoked && (
            <Alert tone="error" title="This certificate has been revoked" className="mt-5">
              {data.revokedReason ?? 'The issuer has withdrawn this credential.'}
              {data.revokedAt && ' (Revoked ' + formatDate(data.revokedAt) + '.)'}
            </Alert>
          )}

          {!data.signatureValid && (
            <Alert tone="error" title="Integrity check failed" className="mt-5">
              This record no longer matches its cryptographic signature. Contact {data.issuerName}.
            </Alert>
          )}
        </div>

        {/* The artwork ---------------------------------------------------- */}
        <div className="mt-6 print:mt-0">
          <CertificateArtwork certificate={data} />
        </div>

        {/* Actions -------------------------------------------------------- */}
        <div className="mt-6 print:hidden">
          <div className="flex flex-wrap gap-3">
            <Button onClick={() => window.print()}>
              <Printer className="size-4" aria-hidden="true" />
              Download PDF
            </Button>

            <Button variant="secondary" onClick={() => copy(data.verificationUrl)}>
              {copied ? (
                <Check className="size-4 text-valid-600" aria-hidden="true" />
              ) : (
                <Copy className="size-4" aria-hidden="true" />
              )}
              {copied ? 'Copied' : 'Copy verification link'}
            </Button>

            <Button variant="secondary" onClick={handleShare}>
              <Share2 className="size-4" aria-hidden="true" />
              Share
            </Button>
          </div>

          <p className="mt-2 text-xs text-ink-500">
            "Download PDF" opens your browser's print dialog — choose "Save as PDF", landscape.
          </p>
          {shareNote && (
            <p className="mt-2 text-xs font-medium text-valid-700" role="status">
              {shareNote}
            </p>
          )}

          {/* Verification link ------------------------------------------- */}
          <section className="mt-8 rounded-2xl bg-ink-50 p-5 ring-1 ring-inset ring-ink-200 sm:p-6">
            <h2 className="font-display text-base font-bold">Share it for verification</h2>
            <p className="mt-1 text-sm text-ink-600">
              Anyone with this link can confirm the credential — no account needed. The QR code on
              the certificate points to the same place.
            </p>

            <div className="mt-4 flex flex-col gap-4 sm:flex-row sm:items-center">
              <div className="min-w-0 flex-1">
                <code className="block truncate rounded-lg bg-surface px-3 py-2.5 font-mono text-xs text-ink-700 ring-1 ring-inset ring-ink-200">
                  {data.verificationUrl}
                </code>
                <dl className="mt-3 grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <dt className="text-ink-500">Certificate ID</dt>
                    <dd className="mt-0.5 font-mono font-medium text-ink-900">
                      {data.certificateId}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-ink-500">Valid until</dt>
                    <dd className="mt-0.5 font-medium text-ink-900">
                      {data.expiresAt ? formatDate(data.expiresAt) : 'No expiry'}
                    </dd>
                  </div>
                </dl>
              </div>

              <div className="flex shrink-0 flex-col items-center gap-1.5">
                <div className="rounded-xl bg-surface p-2.5 ring-1 ring-ink-200">
                  <QrCode value={data.verificationUrl} size={104} />
                </div>
                <span className="text-[11px] text-ink-500">Scan to verify</span>
              </div>
            </div>
          </section>

          {/* Skills -------------------------------------------------------- */}
          {data.skills.length > 0 && (
            <section className="mt-6">
              <h2 className="text-xs font-semibold uppercase tracking-wider text-ink-500">
                Skills validated
              </h2>
              <ul className="mt-3 flex flex-wrap gap-2">
                {data.skills.map((skill) => (
                  <li
                    key={skill}
                    className={cn(
                      'rounded-full px-3 py-1.5 text-xs font-medium ring-1 ring-inset',
                      'bg-brand-50 text-brand-700 ring-brand-100',
                    )}
                  >
                    {skill}
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>
      </div>
    </>
  );
}
