import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Lock, LogIn, Mail } from 'lucide-react';
import { ROLE_HOME, loginSchema, type LoginInput } from '@skillseal/shared';
import { AuthLayout } from '@/components/layout/AuthLayout';
import { Seo } from '@/components/seo/Seo';
import { Alert } from '@/components/ui/Alert';
import { Button } from '@/components/ui/Button';
import { Checkbox, PasswordField, TextField } from '@/components/ui/Field';
import { ApiError } from '@/lib/api-client';
import { useAuth } from './AuthProvider';

/**
 * The three self-signup roles. Administrators sign in at /admin/login, which
 * is not advertised here — see AdminLoginPage for why that is an entry point
 * rather than a security boundary.
 */
const DEMO_ACCOUNTS = [
  { label: 'Learner', email: 'student@demo.test' },
  { label: 'Training provider', email: 'company@demo.test' },
  { label: 'Employer / HR', email: 'hr@demo.test' },
];
const DEMO_PASSWORD = 'Demo@1234!';

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [formError, setFormError] = useState<string | null>(null);

  // Set by ProtectedRoute when it intercepted a deep link.
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
      navigate(redirectTo ?? ROLE_HOME[user.role], { replace: true });
    } catch (error) {
      if (error instanceof ApiError) {
        // Field-level messages take priority over the banner.
        if (error.details) {
          for (const [field, messages] of Object.entries(error.details)) {
            if (field in values && messages[0]) {
              setError(field as keyof LoginInput, { message: messages[0] });
            }
          }
          if (Object.keys(error.details).length > 0) return;
        }
        setFormError(error.message);
        return;
      }
      setFormError('We could not reach the server. Check your connection and try again.');
    }
  }

  function fillDemo(email: string) {
    setValue('email', email, { shouldValidate: true });
    setValue('password', DEMO_PASSWORD, { shouldValidate: true });
    setFormError(null);
  }

  return (
    <>
      <Seo
        title="Sign in"
        description="Sign in to your SkillSeal account to manage courses, take assessments, issue certificates or verify credentials."
        path="/login"
        noIndex
      />

      <AuthLayout
        title="Welcome back"
        subtitle="Sign in to keep learning, manage your courses, or verify a candidate's credentials."
        footer={
          <p className="text-center text-sm text-ink-600">
            New to SkillSeal?{' '}
            <Link to="/register" className="font-semibold text-brand-600 hover:text-brand-700">
              Create an account
            </Link>
          </p>
        }
      >
        <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-5">
          {formError && <Alert tone="error">{formError}</Alert>}

          <TextField
            label="Email address"
            type="email"
            autoComplete="email"
            placeholder="you@company.com"
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

          <div className="flex items-center justify-between gap-4">
            <Checkbox label="Keep me signed in" {...register('rememberMe')} />
            <Link
              to="/forgot-password"
              className="rounded text-sm font-medium text-brand-600 transition hover:text-brand-700"
            >
              Forgot password?
            </Link>
          </div>

          <Button
            type="submit"
            size="lg"
            fullWidth
            isLoading={isSubmitting}
            loadingText="Signing in…"
          >
            <LogIn className="size-4" aria-hidden="true" />
            Sign in
          </Button>
        </form>

        {/* Demo shortcuts. Remove this block before a production deploy. */}
        <div className="mt-8 rounded-xl bg-ink-50 p-4 ring-1 ring-inset ring-ink-200">
          <p className="text-xs font-semibold uppercase tracking-wider text-ink-500">
            Demo accounts
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            {DEMO_ACCOUNTS.map((account) => (
              <button
                key={account.email}
                type="button"
                onClick={() => fillDemo(account.email)}
                className="rounded-lg bg-surface px-3 py-1.5 text-xs font-medium text-ink-700 ring-1 ring-inset ring-ink-200 transition hover:bg-brand-50 hover:text-brand-700 hover:ring-brand-200"
              >
                {account.label}
              </button>
            ))}
          </div>
          <p className="mt-3 font-mono text-[11px] text-ink-500">Password: {DEMO_PASSWORD}</p>
        </div>
      </AuthLayout>
    </>
  );
}
