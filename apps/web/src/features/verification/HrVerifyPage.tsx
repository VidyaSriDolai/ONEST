import { useState, type FormEvent } from 'react';
import { useMutation } from '@tanstack/react-query';
import { History, QrCode, ScanLine, Search, ShieldCheck } from 'lucide-react';
import {
  CERTIFICATE_ID_PATTERN,
  normalizeCertificateId,
  type VerificationResponse,
} from '@skillseal/shared';
import { Seo } from '@/components/seo/Seo';
import { Alert } from '@/components/ui/Alert';
import { Button } from '@/components/ui/Button';
import { VerificationResultCard } from './VerificationResultCard';
import { verificationApi } from './verification-api';
import { ApiError } from '@/lib/api-client';
import { cn } from '@/lib/cn';

/** IDs seeded for the demo, so the page can be exercised without hunting. */
const SAMPLES = [
  { id: 'SS-2026-4F8A-21D9', label: 'Valid' },
  { id: 'SS-2023-7K2M-55XP', label: 'Expired' },
  { id: 'SS-2026-9QW3-4RT7', label: 'Revoked' },
  { id: 'SS-2026-TMP1-8VZ2', label: 'Tampered' },
];

interface Checked {
  response: VerificationResponse;
  queriedId: string;
}

/**
 * Employer verification (spec screen 19).
 *
 * Differs from the public page in two ways: the check is attributed to the
 * signed-in user so it lands in their history, and the input is sized as the
 * primary action on the screen rather than one element among many.
 */
export default function HrVerifyPage() {
  const [value, setValue] = useState('');
  const [touched, setTouched] = useState(false);
  const [checked, setChecked] = useState<Checked | null>(null);
  const [recent, setRecent] = useState<Checked[]>([]);

  const normalized = normalizeCertificateId(value);
  const isMalformed = touched && value.length > 0 && !CERTIFICATE_ID_PATTERN.test(normalized);

  const mutation = useMutation({
    mutationFn: (id: string) => verificationApi.verifyAsHr(id),
    onSuccess: (response, id) => {
      const entry = { response, queriedId: id };
      setChecked(entry);
      // Keep a short in-session list; the durable history screen is separate.
      setRecent((prev) => [entry, ...prev.filter((r) => r.queriedId !== id)].slice(0, 5));
    },
  });

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setTouched(true);
    if (!value.trim() || !CERTIFICATE_ID_PATTERN.test(normalized)) return;
    mutation.mutate(normalized);
  }

  function runSample(id: string) {
    setValue(id);
    setTouched(true);
    mutation.mutate(id);
  }

  return (
    <>
      <Seo
        title="Verify a candidate"
        description="Check a candidate's certification by ID or QR code."
        path="/hr/verify"
        noIndex
      />

      <div className="container-page max-w-3xl py-8 sm:py-12">
        <header>
          <h1 className="font-display text-2xl font-extrabold tracking-tight sm:text-3xl">
            Verify a candidate
          </h1>
          <p className="mt-2 text-ink-600">
            Enter the certificate ID from a candidate's CV or scan the QR code on their
            certificate. Every check is recorded in your verification history.
          </p>
        </header>

        {/* Primary action --------------------------------------------------- */}
        <section className="mt-7 rounded-2xl bg-surface p-5 shadow-card ring-1 ring-ink-200 sm:p-6">
          <form onSubmit={handleSubmit} noValidate>
            <label
              htmlFor="hr-certificate-id"
              className="block text-sm font-semibold text-ink-800"
            >
              Certificate ID
            </label>

            <div className="mt-2 flex flex-col gap-3 sm:flex-row">
              <div className="relative flex-1">
                <Search
                  className="pointer-events-none absolute left-4 top-1/2 size-5 -translate-y-1/2 text-ink-400"
                  aria-hidden="true"
                />
                <input
                  id="hr-certificate-id"
                  value={value}
                  onChange={(event) => setValue(event.target.value)}
                  onBlur={() => setTouched(true)}
                  placeholder="SS-2026-4F8A-21D9"
                  autoComplete="off"
                  autoCapitalize="characters"
                  spellCheck={false}
                  autoFocus
                  aria-invalid={isMalformed || undefined}
                  aria-describedby={isMalformed ? 'hr-certificate-id-error' : undefined}
                  className={cn(
                    'block w-full rounded-xl border-0 bg-surface py-4 pl-12 pr-4 font-mono text-lg uppercase tracking-wider text-ink-900 ring-1 ring-inset transition',
                    'placeholder:font-sans placeholder:text-base placeholder:normal-case placeholder:tracking-normal placeholder:text-ink-400',
                    'focus:ring-2 focus:ring-inset focus:ring-brand-500',
                    isMalformed ? 'ring-danger-300' : 'ring-ink-200 hover:ring-ink-300',
                  )}
                />
              </div>

              <Button
                type="submit"
                size="lg"
                className="sm:w-auto sm:px-8"
                isLoading={mutation.isPending}
                loadingText="Checking…"
              >
                <ShieldCheck className="size-4" aria-hidden="true" />
                Verify
              </Button>
            </div>

            {isMalformed && (
              <p id="hr-certificate-id-error" className="mt-2 text-xs text-danger-600" role="alert">
                That does not look like a certificate ID. The format is SS-2026-4F8A-21D9.
              </p>
            )}

            <div className="mt-4 flex flex-wrap items-center gap-3 border-t border-ink-200 pt-4">
              <Button
                type="button"
                variant="secondary"
                size="sm"
                disabled
                title="Camera scanning arrives with the mobile release"
              >
                <ScanLine className="size-4" aria-hidden="true" />
                Scan QR code
              </Button>
              <p className="text-xs text-ink-500">
                Dashes optional. Bulk and API verification are on the history screen.
              </p>
            </div>
          </form>
        </section>

        {/* Demo shortcuts. Remove before a production deploy. --------------- */}
        <div className="mt-4 rounded-xl bg-ink-50 p-4 ring-1 ring-inset ring-ink-200">
          <p className="text-xs font-semibold uppercase tracking-wider text-ink-500">
            Sample certificates
          </p>
          <div className="mt-2.5 flex flex-wrap gap-2">
            {SAMPLES.map((sample) => (
              <button
                key={sample.id}
                type="button"
                onClick={() => runSample(sample.id)}
                className="rounded-lg bg-surface px-3 py-1.5 text-xs font-medium text-ink-700 ring-1 ring-inset ring-ink-200 transition hover:bg-brand-50 hover:text-brand-700 hover:ring-brand-200"
              >
                {sample.label}
              </button>
            ))}
          </div>
        </div>

        {/* Result ------------------------------------------------------------ */}
        <div className="mt-6">
          {mutation.isError && (
            <Alert tone="error" title="We could not complete the check">
              {mutation.error instanceof ApiError
                ? mutation.error.message
                : 'Something went wrong. Please try again in a moment.'}
            </Alert>
          )}

          {checked && !mutation.isPending && (
            <VerificationResultCard
              response={checked.response}
              queriedId={checked.queriedId}
            />
          )}
        </div>

        {/* This-session history ---------------------------------------------- */}
        {recent.length > 1 && (
          <section className="mt-8">
            <h2 className="flex items-center gap-2 text-sm font-semibold text-ink-700">
              <History className="size-4 text-ink-400" aria-hidden="true" />
              Checked in this session
            </h2>
            <ul className="mt-3 divide-y divide-ink-200 overflow-hidden rounded-xl bg-surface ring-1 ring-ink-200">
              {recent.map((entry) => (
                <li key={entry.queriedId}>
                  <button
                    type="button"
                    onClick={() => setChecked(entry)}
                    className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left transition hover:bg-ink-50"
                  >
                    <span className="min-w-0">
                      <span className="block font-mono text-xs text-ink-700">
                        {entry.queriedId}
                      </span>
                      <span className="block truncate text-xs text-ink-500">
                        {entry.response.certificate?.holderName ?? 'No matching certificate'}
                      </span>
                    </span>
                    <ResultPill result={entry.response.result} />
                  </button>
                </li>
              ))}
            </ul>
          </section>
        )}

        {!checked && !mutation.isPending && (
          <p className="mt-10 flex items-center justify-center gap-2 text-center text-sm text-ink-500">
            <QrCode className="size-4" aria-hidden="true" />
            Results appear here, usually in well under a second.
          </p>
        )}
      </div>
    </>
  );
}

function ResultPill({ result }: { result: VerificationResponse['result'] }) {
  const tone =
    result === 'VALID'
      ? 'bg-valid-50 text-valid-700 ring-valid-100'
      : result === 'EXPIRED'
        ? 'bg-warn-50 text-accent-700 ring-accent-100'
        : result === 'NOT_FOUND'
          ? 'bg-ink-100 text-ink-600 ring-ink-200'
          : 'bg-danger-50 text-danger-700 ring-danger-100';

  return (
    <span
      className={cn(
        'shrink-0 rounded-full px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide ring-1 ring-inset',
        tone,
      )}
    >
      {result.replace('_', ' ')}
    </span>
  );
}
