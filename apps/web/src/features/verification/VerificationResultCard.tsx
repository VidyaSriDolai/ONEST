import {
  AlertTriangle,
  BadgeCheck,
  CalendarClock,
  Ban,
  Building2,
  Clock,
  FileQuestion,
  Hash,
  ShieldAlert,
  ShieldCheck,
  User,
} from 'lucide-react';
import {
  VERIFICATION_COPY,
  type VerificationResponse,
  type VerificationResult,
} from '@skillseal/shared';
import { cn } from '@/lib/cn';

/**
 * Visual treatment per outcome.
 *
 * TAMPERED and REVOKED are deliberately given the same alarming red as each
 * other: from an employer's point of view both mean "do not accept this", and
 * the distinction between them is explained in the body copy rather than
 * softened by a gentler colour.
 */
const STYLES: Record<
  VerificationResult,
  {
    banner: string;
    chip: string;
    icon: typeof ShieldCheck;
    iconWrap: string;
    accent: string;
  }
> = {
  VALID: {
    banner: 'bg-valid-600 text-white',
    chip: 'bg-white/15 text-white ring-white/25',
    icon: ShieldCheck,
    iconWrap: 'bg-white/15 text-white ring-white/25',
    accent: 'text-valid-700',
  },
  EXPIRED: {
    banner: 'bg-accent-500 text-white',
    chip: 'bg-white/15 text-white ring-white/25',
    icon: CalendarClock,
    iconWrap: 'bg-white/15 text-white ring-white/25',
    accent: 'text-accent-700',
  },
  REVOKED: {
    banner: 'bg-danger-600 text-white',
    chip: 'bg-white/15 text-white ring-white/25',
    icon: Ban,
    iconWrap: 'bg-white/15 text-white ring-white/25',
    accent: 'text-danger-700',
  },
  TAMPERED: {
    banner: 'bg-danger-700 text-white',
    chip: 'bg-white/15 text-white ring-white/25',
    icon: ShieldAlert,
    iconWrap: 'bg-white/15 text-white ring-white/25',
    accent: 'text-danger-700',
  },
  NOT_FOUND: {
    banner: 'bg-ink-700 text-white',
    chip: 'bg-white/10 text-white ring-white/20',
    icon: FileQuestion,
    iconWrap: 'bg-white/10 text-white ring-white/20',
    accent: 'text-ink-700',
  },
};

function formatDate(iso: string | null): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

/** The checkmark that draws itself, per the spec's "animated checkmark on VALID". */
function AnimatedCheck() {
  return (
    <svg viewBox="0 0 52 52" className="size-10" fill="none" aria-hidden="true">
      <circle cx="26" cy="26" r="24" stroke="currentColor" strokeWidth="3" opacity="0.35" />
      <path
        d="m15 27 8 8 15-16"
        stroke="currentColor"
        strokeWidth="4"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeDasharray="48"
        className="animate-draw-check"
      />
    </svg>
  );
}

interface DetailRowProps {
  icon: typeof User;
  label: string;
  children: React.ReactNode;
}

function DetailRow({ icon: Icon, label, children }: DetailRowProps) {
  return (
    <div className="flex items-start gap-3 py-3.5">
      <Icon className="mt-0.5 size-4.5 shrink-0 text-ink-400" aria-hidden="true" />
      <dt className="w-24 shrink-0 text-sm text-ink-500 sm:w-32">{label}</dt>
      <dd className="min-w-0 flex-1 text-sm font-medium text-ink-900">{children}</dd>
    </div>
  );
}

export interface VerificationResultCardProps {
  response: VerificationResponse;
  /** The ID that was looked up — shown when no certificate came back. */
  queriedId?: string;
  className?: string;
}

export function VerificationResultCard({
  response,
  queriedId,
  className,
}: VerificationResultCardProps) {
  const { result, certificate, verifiedAt } = response;
  const style = STYLES[result];
  const copy = VERIFICATION_COPY[result];
  const Icon = style.icon;

  return (
    <article
      className={cn(
        'overflow-hidden rounded-2xl bg-surface shadow-lifted ring-1 ring-ink-200 animate-fade-up',
        className,
      )}
      // Announced as a whole once the result lands, rather than field by field.
      aria-live="polite"
    >
      {/* Status banner ------------------------------------------------------ */}
      <header className={cn('px-6 py-7 sm:px-8', style.banner)}>
        <div className="flex items-start gap-4">
          <span
            className={cn(
              'flex size-14 shrink-0 items-center justify-center rounded-2xl ring-1 ring-inset',
              style.iconWrap,
            )}
          >
            {result === 'VALID' ? <AnimatedCheck /> : <Icon className="size-7" aria-hidden="true" />}
          </span>

          <div className="min-w-0 flex-1">
            <p className="font-mono text-xs font-bold uppercase tracking-[0.18em] opacity-80">
              {copy.label}
            </p>
            <h2 className="mt-1 font-display text-2xl font-extrabold leading-tight text-white sm:text-3xl">
              {copy.headline}
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-white/85">{copy.detail}</p>
          </div>
        </div>
      </header>

      {/* Body --------------------------------------------------------------- */}
      {certificate ? (
        <div className="px-6 py-5 sm:px-8 sm:py-6">
          <dl className="divide-y divide-ink-200">
            <DetailRow icon={User} label="Candidate">
              {certificate.holderName}
            </DetailRow>

            <DetailRow icon={BadgeCheck} label="Certification">
              {certificate.trackName}
              {certificate.nsqfLevel !== null && (
                <span className="ml-2 inline-block whitespace-nowrap rounded-full bg-ink-100 px-2 py-0.5 text-xs font-medium text-ink-600">
                  NSQF Level {certificate.nsqfLevel}
                </span>
              )}
            </DetailRow>

            <DetailRow icon={Building2} label="Issued by">
              {certificate.issuerName}
            </DetailRow>

            <DetailRow icon={Hash} label="Certificate ID">
              <span className="font-mono text-[13px] tracking-wide">
                {certificate.certificateId}
              </span>
            </DetailRow>

            <DetailRow icon={Clock} label="Issued on">
              {formatDate(certificate.issuedAt)}
            </DetailRow>

            <DetailRow icon={CalendarClock} label="Valid until">
              <span className={cn(result === 'EXPIRED' && 'text-accent-700')}>
                {certificate.expiresAt ? formatDate(certificate.expiresAt) : 'No expiry'}
              </span>
            </DetailRow>

            {certificate.revokedAt && (
              <DetailRow icon={Ban} label="Revoked on">
                <span className="text-danger-700">{formatDate(certificate.revokedAt)}</span>
                {certificate.revokedReason && (
                  <p className="mt-1 text-xs font-normal leading-relaxed text-ink-600">
                    {certificate.revokedReason}
                  </p>
                )}
              </DetailRow>
            )}
          </dl>

          {/* Skills ----------------------------------------------------------- */}
          {certificate.skills.length > 0 && (
            <div className="mt-5 border-t border-ink-200 pt-5">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-ink-500">
                Skills validated
              </h3>
              <ul className="mt-3 flex flex-wrap gap-2">
                {certificate.skills.map((skill) => (
                  <li
                    key={skill}
                    className="rounded-full bg-brand-50 px-3 py-1 text-xs font-medium text-brand-700 ring-1 ring-inset ring-brand-100"
                  >
                    {skill}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Integrity + ONEST ------------------------------------------------ */}
          <div className="mt-5 flex flex-wrap items-center gap-2 border-t border-ink-200 pt-5">
            {certificate.signatureValid ? (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-valid-50 px-3 py-1.5 text-xs font-semibold text-valid-700 ring-1 ring-inset ring-valid-100">
                <ShieldCheck className="size-3.5" aria-hidden="true" />
                Signature verified
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-danger-50 px-3 py-1.5 text-xs font-semibold text-danger-700 ring-1 ring-inset ring-danger-100">
                <AlertTriangle className="size-3.5" aria-hidden="true" />
                Signature does not match
              </span>
            )}

            {certificate.onestStatus === 'PUBLISHED' && (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-brand-50 px-3 py-1.5 text-xs font-semibold text-brand-700 ring-1 ring-inset ring-brand-100">
                <BadgeCheck className="size-3.5" aria-hidden="true" />
                Published to ONEST
              </span>
            )}

            {certificate.score !== null && (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-ink-100 px-3 py-1.5 text-xs font-semibold text-ink-700">
                Assessment score {certificate.score}%
              </span>
            )}
          </div>
        </div>
      ) : (
        <div className="px-6 py-6 sm:px-8">
          {queriedId && (
            <p className="text-sm text-ink-600">
              We looked up{' '}
              <span className="font-mono text-[13px] font-medium text-ink-900">{queriedId}</span>{' '}
              and found no matching certificate.
            </p>
          )}
          <ul className="mt-4 space-y-2 text-sm text-ink-600">
            <li className="flex gap-2">
              <span className="text-ink-400" aria-hidden="true">
                •
              </span>
              Check for typing errors — the format is{' '}
              <span className="font-mono text-[13px]">SS-2026-4F8A-21D9</span>.
            </li>
            <li className="flex gap-2">
              <span className="text-ink-400" aria-hidden="true">
                •
              </span>
              Scanning the QR code on the certificate avoids mistyping entirely.
            </li>
          </ul>
        </div>
      )}

      {/* Receipt footer ----------------------------------------------------- */}
      <footer className="border-t border-ink-200 bg-ink-50 px-6 py-3.5 sm:px-8">
        <p className="text-xs text-ink-500">
          Checked {new Date(verifiedAt).toLocaleString()} · This result is generated live and is
          never cached.
        </p>
      </footer>
    </article>
  );
}
