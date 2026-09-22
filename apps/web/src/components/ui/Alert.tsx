import type { ReactNode } from 'react';
import { AlertTriangle, CheckCircle2, Info, XCircle } from 'lucide-react';
import { cn } from '@/lib/cn';

const TONES = {
  info: {
    container: 'bg-brand-50 text-brand-900 ring-brand-100',
    icon: 'text-brand-600',
    Icon: Info,
  },
  success: {
    container: 'bg-valid-50 text-valid-700 ring-valid-100',
    icon: 'text-valid-600',
    Icon: CheckCircle2,
  },
  warning: {
    container: 'bg-warn-50 text-accent-700 ring-accent-100',
    icon: 'text-accent-600',
    Icon: AlertTriangle,
  },
  error: {
    container: 'bg-danger-50 text-danger-700 ring-danger-100',
    icon: 'text-danger-600',
    Icon: XCircle,
  },
} as const;

export interface AlertProps {
  tone?: keyof typeof TONES;
  title?: string;
  children?: ReactNode;
  className?: string;
}

export function Alert({ tone = 'info', title, children, className }: AlertProps) {
  const { container, icon, Icon } = TONES[tone];

  return (
    <div
      // Errors interrupt; everything else is announced politely.
      role={tone === 'error' ? 'alert' : 'status'}
      className={cn(
        'flex items-start gap-3 rounded-xl px-4 py-3 text-sm ring-1 ring-inset animate-fade-in',
        container,
        className,
      )}
    >
      <Icon className={cn('mt-0.5 size-4.5 shrink-0', icon)} aria-hidden="true" />
      <div className="min-w-0 flex-1">
        {title && <p className="font-semibold">{title}</p>}
        {children && <div className={cn(title && 'mt-0.5', 'leading-relaxed')}>{children}</div>}
      </div>
    </div>
  );
}
