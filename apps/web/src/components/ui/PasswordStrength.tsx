import { Check, X } from 'lucide-react';
import { PASSWORD_RULES, assessPassword, type PasswordStrength } from '@skillseal/shared';
import { cn } from '@/lib/cn';

const METER = {
  weak: { label: 'Weak', bar: 'bg-danger-500', text: 'text-danger-600', segments: 1 },
  fair: { label: 'Fair', bar: 'bg-accent-500', text: 'text-accent-600', segments: 2 },
  good: { label: 'Good', bar: 'bg-brand-500', text: 'text-brand-600', segments: 3 },
  strong: { label: 'Strong', bar: 'bg-valid-500', text: 'text-valid-600', segments: 4 },
} satisfies Record<PasswordStrength, { label: string; bar: string; text: string; segments: number }>;

export interface PasswordStrengthMeterProps {
  value: string;
  /** Hides the per-rule checklist, leaving just the bar. */
  compact?: boolean;
}

/**
 * Scores against the same rules the API enforces (from @skillseal/shared), so
 * the meter can never say "strong" for a password the server would reject.
 */
export function PasswordStrengthMeter({ value, compact }: PasswordStrengthMeterProps) {
  if (!value) return null;

  const assessment = assessPassword(value);
  const meter = METER[assessment.strength];

  return (
    <div className="space-y-2 pt-1 animate-fade-in">
      <div className="flex items-center gap-2">
        <div className="flex flex-1 gap-1" aria-hidden="true">
          {[0, 1, 2, 3].map((index) => (
            <div
              key={index}
              className={cn(
                'h-1.5 flex-1 rounded-full transition-colors duration-300',
                index < meter.segments ? meter.bar : 'bg-ink-200',
              )}
            />
          ))}
        </div>
        <span className={cn('w-12 text-right text-xs font-semibold', meter.text)}>
          {meter.label}
        </span>
      </div>

      {/* One polite announcement instead of a reading per keystroke. */}
      <p className="sr-only" aria-live="polite">
        Password strength: {meter.label}
      </p>

      {!compact && (
        <ul className="grid grid-cols-1 gap-x-4 gap-y-1 sm:grid-cols-2">
          {PASSWORD_RULES.map((rule) => {
            const passed = assessment.passed.includes(rule.id);
            return (
              <li
                key={rule.id}
                className={cn(
                  'flex items-center gap-1.5 text-xs transition-colors',
                  passed ? 'text-valid-600' : 'text-ink-500',
                )}
              >
                {passed ? (
                  <Check className="size-3.5 shrink-0" aria-hidden="true" />
                ) : (
                  <X className="size-3.5 shrink-0 text-ink-300" aria-hidden="true" />
                )}
                {rule.label}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
