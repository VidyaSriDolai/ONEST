import { forwardRef, type ButtonHTMLAttributes } from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/cn';

const buttonVariants = cva(
  // `min-h` keeps every button at a comfortable touch target on mobile.
  'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl font-semibold transition-all duration-200 disabled:pointer-events-none disabled:opacity-60 active:scale-[0.98]',
  {
    variants: {
      variant: {
        primary:
          'bg-brand-600 text-white shadow-brand hover:bg-brand-700 hover:shadow-lifted',
        secondary:
          'bg-surface text-brand-700 ring-1 ring-inset ring-ink-200 shadow-card hover:bg-ink-50 hover:ring-ink-300',
        ghost: 'text-ink-600 hover:bg-ink-100 hover:text-ink-900',
        subtle: 'bg-brand-50 text-brand-700 hover:bg-brand-100',
        danger: 'bg-danger-600 text-white hover:bg-danger-700 shadow-card',
        link: 'text-brand-600 underline-offset-4 hover:underline hover:text-brand-700',
      },
      size: {
        sm: 'min-h-9 px-3.5 text-sm',
        md: 'min-h-11 px-5 text-sm',
        lg: 'min-h-12 px-6 text-base',
        icon: 'size-10 p-0',
      },
      fullWidth: {
        true: 'w-full',
      },
    },
    defaultVariants: { variant: 'primary', size: 'md' },
  },
);

export interface ButtonProps
  extends ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  isLoading?: boolean;
  /** Announced to screen readers while `isLoading` is true. */
  loadingText?: string;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { className, variant, size, fullWidth, isLoading, loadingText, children, disabled, ...props },
  ref,
) {
  return (
    <button
      ref={ref}
      className={cn(buttonVariants({ variant, size, fullWidth }), className)}
      disabled={disabled || isLoading}
      aria-busy={isLoading || undefined}
      {...props}
    >
      {isLoading && <Loader2 className="size-4 animate-spin" aria-hidden="true" />}
      {isLoading && loadingText ? loadingText : children}
    </button>
  );
});

export { buttonVariants };
