import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';

export interface TableScrollProps {
  children: ReactNode;
  /** Describes the table for screen readers, e.g. "Audit log entries". */
  label: string;
  className?: string;
}

/**
 * Horizontally scrollable wrapper for wide tables.
 *
 * A plain `overflow-x-auto` div cannot be scrolled by keyboard: there is no
 * way to move the viewport without a pointer, so content past the right edge
 * is unreachable (axe: scrollable-region-focusable, serious). Making it
 * focusable and labelling it as a region fixes that — the user tabs to it and
 * scrolls with the arrow keys.
 */
export function TableScroll({ children, label, className }: TableScrollProps) {
  return (
    <div
      className={cn('overflow-x-auto focus-visible:outline-none', className)}
      tabIndex={0}
      role="region"
      aria-label={label}
    >
      {children}
    </div>
  );
}
