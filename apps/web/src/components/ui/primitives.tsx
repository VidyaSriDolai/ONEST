import { useEffect, useRef, useState, type ReactNode } from 'react';
import { cn } from '@/lib/cn';

/* ------------------------------------------------------------------ card -- */

export function Card({ className, children }: { className?: string; children: ReactNode }) {
  return (
    <div className={cn('rounded-2xl bg-surface shadow-card ring-1 ring-ink-200', className)}>
      {children}
    </div>
  );
}

export function CardHeader({
  title,
  description,
  action,
}: {
  title: ReactNode;
  description?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-3 border-b border-ink-200 px-5 py-4">
      <div className="min-w-0">
        <h2 className="font-display text-base font-bold text-ink-900">{title}</h2>
        {description && <p className="mt-0.5 text-sm text-ink-600">{description}</p>}
      </div>
      {action}
    </div>
  );
}

/* ------------------------------------------------------------- count-up -- */

/**
 * Animates from 0 to `value`, as the spec asks for on the dashboards.
 * Falls straight to the final value when the user prefers reduced motion.
 */
export function CountUp({ value, duration = 900 }: { value: number; duration?: number }) {
  const [display, setDisplay] = useState(0);
  const frame = useRef<number>(0);

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setDisplay(value);
      return;
    }

    const start = performance.now();
    const tick = (now: number) => {
      const progress = Math.min((now - start) / duration, 1);
      // Ease-out cubic: fast at first, settling gently on the final number.
      setDisplay(Math.round(value * (1 - Math.pow(1 - progress, 3))));
      if (progress < 1) frame.current = requestAnimationFrame(tick);
    };

    frame.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame.current);
  }, [value, duration]);

  return <>{display.toLocaleString()}</>;
}

/* ------------------------------------------------------------- stat card -- */

export interface StatCardProps {
  label: string;
  value: number;
  icon?: ReactNode;
  hint?: string;
  tone?: 'brand' | 'valid' | 'accent' | 'danger';
  suffix?: string;
  animate?: boolean;
}

const STAT_TONES = {
  brand: 'bg-brand-50 text-brand-600',
  valid: 'bg-valid-50 text-valid-600',
  accent: 'bg-accent-50 text-accent-600',
  danger: 'bg-danger-50 text-danger-600',
} as const;

export function StatCard({
  label,
  value,
  icon,
  hint,
  tone = 'brand',
  suffix,
  animate = true,
}: StatCardProps) {
  return (
    <div className="rounded-2xl bg-surface p-5 shadow-card ring-1 ring-ink-200">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm text-ink-500">{label}</p>
          <p className="mt-1.5 font-display text-3xl font-extrabold text-ink-900">
            {animate ? <CountUp value={value} /> : value.toLocaleString()}
            {suffix && <span className="text-xl">{suffix}</span>}
          </p>
          {hint && <p className="mt-1 text-xs text-ink-500">{hint}</p>}
        </div>
        {icon && (
          <span
            className={cn(
              'flex size-10 shrink-0 items-center justify-center rounded-xl',
              STAT_TONES[tone],
            )}
            aria-hidden="true"
          >
            {icon}
          </span>
        )}
      </div>
    </div>
  );
}

/* -------------------------------------------------------------- progress -- */

export function ProgressBar({
  value,
  className,
  tone = 'brand',
  showLabel,
  label = 'Progress',
}: {
  value: number;
  className?: string;
  tone?: 'brand' | 'valid' | 'accent';
  showLabel?: boolean;
  /** Accessible name. A role="progressbar" without one is announced as a
   *  bare percentage with no indication of what it measures. */
  label?: string;
}) {
  const clamped = Math.max(0, Math.min(100, value));
  const bar =
    tone === 'valid' ? 'bg-valid-500' : tone === 'accent' ? 'bg-accent-500' : 'bg-brand-600';

  return (
    <div className={cn('flex items-center gap-2.5', className)}>
      <div
        className="h-2 flex-1 overflow-hidden rounded-full bg-ink-200"
        role="progressbar"
        aria-label={label}
        aria-valuenow={clamped}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuetext={clamped + '% complete'}
      >
        <div
          className={cn('h-full rounded-full transition-[width] duration-700 ease-out', bar)}
          style={{ width: clamped + '%' }}
        />
      </div>
      {showLabel && (
        <span className="w-10 shrink-0 text-right text-xs font-semibold text-ink-600">
          {clamped}%
        </span>
      )}
    </div>
  );
}

/** Circular progress, per the spec's "circular progress ring". */
export function ProgressRing({
  value,
  size = 120,
  stroke = 10,
  label,
  sublabel,
  tone = 'brand',
}: {
  value: number;
  size?: number;
  stroke?: number;
  label?: string;
  sublabel?: string;
  tone?: 'brand' | 'valid' | 'danger';
}) {
  const clamped = Math.max(0, Math.min(100, value));
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const colour =
    tone === 'valid' ? '#059669' : tone === 'danger' ? '#e11d48' : '#4f46e5';

  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90" aria-hidden="true">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="#e2e8f0"
          strokeWidth={stroke}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={colour}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={circumference - (clamped / 100) * circumference}
          style={{ transition: 'stroke-dashoffset 900ms cubic-bezier(0.16, 1, 0.3, 1)' }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="font-display text-2xl font-extrabold text-ink-900">
          {label ?? clamped + '%'}
        </span>
        {sublabel && <span className="mt-0.5 text-xs text-ink-500">{sublabel}</span>}
      </div>
    </div>
  );
}

/* -------------------------------------------------------------- skeleton -- */

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn('animate-pulse rounded-lg bg-ink-200/70', className)} />;
}

/** Placeholder grid used while a card list loads, per the spec's skeletons. */
export function SkeletonCards({ count = 6 }: { count?: number }) {
  return (
    <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: count }).map((_, index) => (
        <div key={index} className="rounded-2xl bg-surface p-5 shadow-card ring-1 ring-ink-200">
          <Skeleton className="h-4 w-20" />
          <Skeleton className="mt-3 h-5 w-3/4" />
          <Skeleton className="mt-2 h-4 w-full" />
          <Skeleton className="mt-1.5 h-4 w-5/6" />
          <div className="mt-4 flex gap-2">
            <Skeleton className="h-6 w-16 rounded-full" />
            <Skeleton className="h-6 w-16 rounded-full" />
          </div>
        </div>
      ))}
    </div>
  );
}

/* ----------------------------------------------------------- empty state -- */

export function EmptyState({
  icon,
  title,
  description,
  action,
}: {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl bg-surface px-6 py-14 text-center shadow-card ring-1 ring-ink-200">
      {icon && (
        <span
          className="mb-4 flex size-12 items-center justify-center rounded-2xl bg-ink-100 text-ink-400"
          aria-hidden="true"
        >
          {icon}
        </span>
      )}
      <h3 className="font-display text-lg font-bold text-ink-900">{title}</h3>
      {description && <p className="mt-1.5 max-w-sm text-sm text-ink-600">{description}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

/* ----------------------------------------------------------------- badge -- */

const BADGE_TONES = {
  neutral: 'bg-ink-100 text-ink-700 ring-ink-200',
  brand: 'bg-brand-50 text-brand-700 ring-brand-100',
  valid: 'bg-valid-50 text-valid-700 ring-valid-100',
  accent: 'bg-warn-50 text-accent-700 ring-accent-100',
  danger: 'bg-danger-50 text-danger-700 ring-danger-100',
} as const;

export function Badge({
  children,
  tone = 'neutral',
  className,
}: {
  children: ReactNode;
  tone?: keyof typeof BADGE_TONES;
  className?: string;
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset',
        BADGE_TONES[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}

/* ----------------------------------------------------------------- steps -- */

export interface StepperStep {
  label: string;
  state: 'done' | 'current' | 'todo';
}

/** Courses → Assessments → Skills → Eligible → Certificate, per the spec. */
export function Stepper({ steps }: { steps: StepperStep[] }) {
  return (
    <ol className="flex flex-wrap items-center gap-y-3">
      {steps.map((step, index) => (
        <li key={step.label} className="flex items-center">
          <div className="flex items-center gap-2">
            <span
              className={cn(
                'flex size-7 shrink-0 items-center justify-center rounded-full text-xs font-bold ring-1 ring-inset',
                step.state === 'done'
                  ? 'bg-valid-500 text-white ring-valid-500'
                  : step.state === 'current'
                    ? 'bg-brand-600 text-white ring-brand-600'
                    : 'bg-surface text-ink-400 ring-ink-300',
              )}
            >
              {step.state === 'done' ? (
                <svg viewBox="0 0 16 16" className="size-4" fill="none" aria-hidden="true">
                  <path
                    d="m4 8.5 2.5 2.5L12 5.5"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              ) : (
                index + 1
              )}
            </span>
            <span
              className={cn(
                'whitespace-nowrap text-xs font-medium',
                step.state === 'todo' ? 'text-ink-500' : 'text-ink-900',
              )}
            >
              {step.label}
            </span>
          </div>
          {index < steps.length - 1 && (
            <span className="mx-3 h-px w-6 bg-ink-200 sm:w-10" aria-hidden="true" />
          )}
        </li>
      ))}
    </ol>
  );
}
