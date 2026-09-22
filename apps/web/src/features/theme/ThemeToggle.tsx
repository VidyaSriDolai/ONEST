import { Moon, Sun } from 'lucide-react';
import { cn } from '@/lib/cn';
import { useTheme } from './ThemeProvider';

/**
 * Light/dark switch.
 *
 * Announced as a switch with its current state rather than as a plain button,
 * so a screen-reader user knows which mode is active without having to infer
 * it from an icon.
 */
export function ThemeToggle({ className }: { className?: string }) {
  const { theme, toggle } = useTheme();
  const isDark = theme === 'dark';

  return (
    <button
      type="button"
      onClick={toggle}
      role="switch"
      aria-checked={isDark}
      aria-label="Dark mode"
      title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      className={cn(
        'flex size-10 items-center justify-center rounded-xl text-ink-600 transition hover:bg-ink-100 hover:text-ink-900',
        className,
      )}
    >
      {isDark ? (
        <Sun className="size-5" aria-hidden="true" />
      ) : (
        <Moon className="size-5" aria-hidden="true" />
      )}
    </button>
  );
}
