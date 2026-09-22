import {
  forwardRef,
  useId,
  useState,
  type InputHTMLAttributes,
  type ReactNode,
} from 'react';
import { AlertCircle, Eye, EyeOff } from 'lucide-react';
import { cn } from '@/lib/cn';

interface FieldWrapperProps {
  id: string;
  label: string;
  hint?: string;
  error?: string;
  required?: boolean;
  children: ReactNode;
  className?: string;
}

/**
 * Owns the label/hint/error scaffolding so every form control in the app is
 * wired up for assistive technology the same way.
 */
export function FieldWrapper({
  id,
  label,
  hint,
  error,
  required,
  children,
  className,
}: FieldWrapperProps) {
  return (
    <div className={cn('space-y-1.5', className)}>
      <label htmlFor={id} className="block text-sm font-medium text-ink-800">
        {label}
        {required && (
          <span className="ml-0.5 text-danger-600" aria-hidden="true">
            *
          </span>
        )}
      </label>

      {children}

      {hint && !error && (
        <p id={id + '-hint'} className="text-xs text-ink-500">
          {hint}
        </p>
      )}

      {error && (
        <p
          id={id + '-error'}
          className="flex items-start gap-1.5 text-xs font-medium text-danger-600"
          role="alert"
        >
          <AlertCircle className="mt-px size-3.5 shrink-0" aria-hidden="true" />
          <span>{error}</span>
        </p>
      )}
    </div>
  );
}

const inputBase =
  'block w-full rounded-xl border-0 bg-surface px-3.5 py-2.5 text-[15px] text-ink-900 shadow-sm ring-1 ring-inset ring-ink-200 transition placeholder:text-ink-400 hover:ring-ink-300 focus:ring-2 focus:ring-inset focus:ring-brand-500 disabled:cursor-not-allowed disabled:bg-ink-50 disabled:text-ink-500';

export interface TextFieldProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'id'> {
  label: string;
  hint?: string;
  error?: string;
  /** Rendered inside the field, on the left. */
  icon?: ReactNode;
  containerClassName?: string;
}

export const TextField = forwardRef<HTMLInputElement, TextFieldProps>(function TextField(
  { label, hint, error, icon, className, containerClassName, required, ...props },
  ref,
) {
  const id = useId();

  return (
    <FieldWrapper
      id={id}
      label={label}
      hint={hint}
      error={error}
      required={required}
      className={containerClassName}
    >
      <div className="relative">
        {icon && (
          <span
            className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-400"
            aria-hidden="true"
          >
            {icon}
          </span>
        )}
        <input
          ref={ref}
          id={id}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? id + '-error' : hint ? id + '-hint' : undefined}
          aria-required={required || undefined}
          className={cn(
            inputBase,
            icon && 'pl-10',
            error && 'ring-danger-300 focus:ring-danger-500',
            className,
          )}
          {...props}
        />
      </div>
    </FieldWrapper>
  );
});

export interface PasswordFieldProps extends TextFieldProps {
  /** Rendered between the input and any error message (strength meter, rules). */
  footer?: ReactNode;
}

export const PasswordField = forwardRef<HTMLInputElement, PasswordFieldProps>(
  function PasswordField(
    { label, hint, error, icon, className, containerClassName, required, footer, ...props },
    ref,
  ) {
    const id = useId();
    const [visible, setVisible] = useState(false);

    return (
      <FieldWrapper
        id={id}
        label={label}
        hint={hint}
        error={error}
        required={required}
        className={containerClassName}
      >
        <div className="relative">
          {icon && (
            <span
              className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-400"
              aria-hidden="true"
            >
              {icon}
            </span>
          )}
          <input
            ref={ref}
            id={id}
            type={visible ? 'text' : 'password'}
            aria-invalid={error ? true : undefined}
            aria-describedby={error ? id + '-error' : hint ? id + '-hint' : undefined}
            aria-required={required || undefined}
            className={cn(
              inputBase,
              'pr-11',
              icon && 'pl-10',
              error && 'ring-danger-300 focus:ring-danger-500',
              className,
            )}
            {...props}
          />
          <button
            type="button"
            onClick={() => setVisible((v) => !v)}
            className="absolute right-1.5 top-1/2 flex size-9 -translate-y-1/2 items-center justify-center rounded-lg text-ink-400 transition hover:bg-ink-100 hover:text-ink-700"
            aria-label={visible ? 'Hide password' : 'Show password'}
            // The toggle is a convenience, not a form control: keep it out of
            // the tab order so keyboard users move label -> input -> submit.
            tabIndex={-1}
          >
            {visible ? (
              <EyeOff className="size-4.5" aria-hidden="true" />
            ) : (
              <Eye className="size-4.5" aria-hidden="true" />
            )}
          </button>
        </div>
        {footer}
      </FieldWrapper>
    );
  },
);

export interface CheckboxProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type' | 'id'> {
  label: ReactNode;
  error?: string;
}

export const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(function Checkbox(
  { label, error, className, ...props },
  ref,
) {
  const id = useId();

  return (
    <div className="space-y-1.5">
      <div className="flex items-start gap-2.5">
        <input
          ref={ref}
          id={id}
          type="checkbox"
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? id + '-error' : undefined}
          className={cn(
            'mt-0.5 size-4.5 shrink-0 cursor-pointer rounded border-ink-300 text-brand-600 transition focus:ring-brand-500',
            error && 'border-danger-400',
            className,
          )}
          {...props}
        />
        <label htmlFor={id} className="cursor-pointer text-sm leading-relaxed text-ink-600">
          {label}
        </label>
      </div>
      {error && (
        <p id={id + '-error'} className="text-xs font-medium text-danger-600" role="alert">
          {error}
        </p>
      )}
    </div>
  );
});
