import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { KeyRound, Lock, Mail, ScrollText, ShieldAlert, Siren } from 'lucide-react';
import { BRAND, ROLES, ROLE_HOME, loginSchema, type LoginInput } from '@skillseal/shared';
import { Seo } from '@/components/seo/Seo';
import { Alert } from '@/components/ui/Alert';
import { Button } from '@/components/ui/Button';
import { Logo } from '@/components/ui/Logo';
import { PasswordField, TextField } from '@/components/ui/Field';
import { ApiError } from '@/lib/api-client';
import { useAuth } from './AuthProvider';

const DEMO_ADMIN = { email: 'admin@demo.test', password: 'Demo@1234!' };

/**
 * Staff sign-in, deliberately separate from the public /login page.
 *
 * SECURITY NOTE: this is a separate *entry point*, not a security boundary.
 * Both pages post to the same /api/auth/login endpoint, which returns an
 * identical error for every failure. That is intentional: if this page
 * rejected non-admins with a distinct message, an attacker could use it to
 * discover which email addresses hold administrator accounts.
 *
 * A non-admin who signs in here is simply redirected to their own portal, and
 * an admin who signs in on the public page reaches the admin dashboard. The
 * real controls on this role are: no self-registration (ADMIN is excluded from
 * SELF_SIGNUP_ROLES), the audit trail, and — once added — MFA and a shorter
 * session. In production this route is also the natural place to apply an IP
 * allowlist at the edge.
 */
export default function AdminLoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [formError, setFormError] = useState<string | null>(null);

  const redirectTo = (location.state as { from?: string } | null)?.from;

  const {
    register,
    handleSubmit,
    setError,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '', rememberMe: false },
  });

  async function onSubmit(values: LoginInput) {
    setFormError(null);
    try {
      const user = await login(values);
      // Non-admins are sent to their own portal rather than being refused,
      // so this page never reveals which accounts are administrators.
      const destination =
        user.role === ROLES.ADMIN ? (redirectTo ?? ROLE_HOME[user.role]) : ROLE_HOME[user.role];
      navigate(destination, { replace: true });
    } catch (error) {
      if (error instanceof ApiError) {
        if (error.details) {
          let mapped = false;
          for (const [field, messages] of Object.entries(error.details)) {
            if (field in values && messages[0]) {
              setError(field as keyof LoginInput, { message: messages[0] });
              mapped = true;
            }
          }
          if (mapped) return;
        }
        setFormError(error.message);
        return;
      }
      setFormError('We could not reach the server. Check your connection and try again.');
    }
  }

  return (
    <>
      <Seo
        title="Administrator sign-in"
        description="Restricted sign-in for SkillSeal platform administrators."
        path="/admin/login"
        noIndex
      />

      <div className="palette-light flex min-h-dvh flex-col bg-ink-900">
        {/* Decorative field, deliberately cooler and plainer than the public page. */}
        <div aria-hidden="true" className="pointer-events-none fixed inset-0 overflow-hidden">
          <div className="absolute -top-40 left-1/2 size-[36rem] -translate-x-1/2 rounded-full bg-brand-800/25 blur-3xl" />
          <svg className="absolute inset-0 size-full opacity-[0.07]">
            <defs>
              <pattern id="admin-grid" width="40" height="40" patternUnits="userSpaceOnUse">
                <path d="M40 0H0v40" fill="none" stroke="white" strokeWidth="0.5" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#admin-grid)" />
          </svg>
        </div>

        <header className="relative px-4 py-6 sm:px-6">
          <Link to="/" className="inline-block rounded-lg" aria-label={BRAND.name + ' home'}>
            <Logo inverted />
          </Link>
        </header>

        <main className="relative flex flex-1 items-center justify-center px-4 pb-12 sm:px-6">
          <div className="w-full max-w-md">
            {/* A light card on the dark page: visually distinct from the public
                sign-in without needing an inverted variant of every form
                control (and the contrast problems that come with one). */}
            <div className="rounded-2xl bg-surface p-6 shadow-lifted ring-1 ring-ink-200 sm:p-8">
              <span className="flex size-12 items-center justify-center rounded-xl bg-brand-50 text-brand-600 ring-1 ring-inset ring-brand-100">
                <ShieldAlert className="size-6" aria-hidden="true" />
              </span>

              <h1 className="mt-5 font-display text-2xl font-extrabold tracking-tight text-ink-900">
                Administrator sign-in
              </h1>
              <p className="mt-2 text-sm leading-relaxed text-ink-600">
                Restricted to {BRAND.name} platform staff. Administrator accounts are issued
                internally and cannot be self-registered.
              </p>

              <form onSubmit={handleSubmit(onSubmit)} noValidate className="mt-7 space-y-5">
                {formError && <Alert tone="error">{formError}</Alert>}

                <TextField
                  label="Work email"
                  type="email"
                  autoComplete="email"
                  placeholder="admin@skillseal.example.org"
                  icon={<Mail className="size-4.5" />}
                  error={errors.email?.message}
                  required
                  autoFocus
                  {...register('email')}
                />

                <PasswordField
                  label="Password"
                  autoComplete="current-password"
                  placeholder="Enter your password"
                  icon={<Lock className="size-4.5" />}
                  error={errors.password?.message}
                  required
                  {...register('password')}
                />

                <Button
                  type="submit"
                  size="lg"
                  fullWidth
                  isLoading={isSubmitting}
                  loadingText="Verifying…"
                >
                  <KeyRound className="size-4" aria-hidden="true" />
                  Sign in to admin console
                </Button>
              </form>

              <ul className="mt-7 space-y-2.5 border-t border-ink-200 pt-5">
                <li className="flex items-start gap-2.5 text-xs leading-relaxed text-ink-600">
                  <ScrollText className="mt-px size-4 shrink-0 text-ink-400" aria-hidden="true" />
                  Every sign-in attempt is written to the platform audit log with its IP address.
                </li>
                <li className="flex items-start gap-2.5 text-xs leading-relaxed text-ink-600">
                  <Siren className="mt-px size-4 shrink-0 text-ink-400" aria-hidden="true" />
                  Five failed attempts lock the account for 15 minutes.
                </li>
              </ul>
            </div>

            {/* Demo shortcut. Remove before a production deploy. */}
            <div className="mt-5 rounded-xl bg-white/[0.03] p-4 ring-1 ring-inset ring-white/10">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-ink-400">
                    Demo administrator
                  </p>
                  <p className="mt-1 font-mono text-[11px] text-ink-400">{DEMO_ADMIN.email}</p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setValue('email', DEMO_ADMIN.email, { shouldValidate: true });
                    setValue('password', DEMO_ADMIN.password, { shouldValidate: true });
                    setFormError(null);
                  }}
                  className="shrink-0 rounded-lg bg-white/10 px-3 py-1.5 text-xs font-medium text-white ring-1 ring-inset ring-white/15 transition hover:bg-white/15"
                >
                  Fill
                </button>
              </div>
            </div>

            <p className="mt-6 text-center text-sm text-ink-400">
              Not an administrator?{' '}
              <Link to="/login" className="font-semibold text-brand-300 hover:text-brand-200">
                Sign in here
              </Link>
            </p>
          </div>
        </main>
      </div>
    </>
  );
}
