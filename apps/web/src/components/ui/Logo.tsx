import { BRAND } from '@skillseal/shared';
import { cn } from '@/lib/cn';

export interface LogoProps {
  className?: string;
  /** Inverted palette for dark backgrounds (footer, auth split panel). */
  inverted?: boolean;
  showWordmark?: boolean;
}

/**
 * A seal enclosing a checkmark: the certificate, and the fact that it verified.
 * Drawn inline so it scales crisply and inherits the surrounding colour.
 */
export function Logo({ className, inverted, showWordmark = true }: LogoProps) {
  return (
    <span className={cn('inline-flex items-center gap-2.5', className)}>
      <svg
        viewBox="0 0 32 32"
        className="size-8 shrink-0"
        role="img"
        aria-label={BRAND.name + ' logo'}
      >
        <defs>
          <linearGradient id="ss-logo-gradient" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor={inverted ? '#a5b4fc' : '#6366f1'} />
            <stop offset="100%" stopColor={inverted ? '#6366f1' : '#3730a3'} />
          </linearGradient>
        </defs>
        <path
          d="M16 2.5 27.5 7v9.2c0 6.4-4.6 11.6-11.5 13.3C9.1 27.8 4.5 22.6 4.5 16.2V7L16 2.5Z"
          fill="url(#ss-logo-gradient)"
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

      {showWordmark && (
        <span
          className={cn(
            'font-display text-lg font-extrabold tracking-tight',
            inverted ? 'text-white' : 'text-ink-900',
          )}
        >
          {BRAND.name}
        </span>
      )}
    </span>
  );
}
