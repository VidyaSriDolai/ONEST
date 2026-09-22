import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { ArrowLeft, Mail, MailCheck, Send } from 'lucide-react';
import { forgotPasswordSchema, type ForgotPasswordInput } from '@skillseal/shared';
import { AuthLayout } from '@/components/layout/AuthLayout';
import { Seo } from '@/components/seo/Seo';
import { Alert } from '@/components/ui/Alert';
import { Button } from '@/components/ui/Button';
import { TextField } from '@/components/ui/Field';
import { ApiError } from '@/lib/api-client';
import { authApi } from './auth-api';

export default function ForgotPasswordPage() {
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    getValues,
    formState: { errors, isSubmitting },
  } = useForm<ForgotPasswordInput>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: { email: '' },
  });

  async function onSubmit(values: ForgotPasswordInput) {
    setFormError(null);
    try {
      await authApi.forgotPassword(values);
      // The API answers identically whether or not the account exists, and so
      // does this screen — it must not confirm which emails are registered.
      setSentTo(values.email);
    } catch (error) {
      setFormError(
        error instanceof ApiError
          ? error.message
          : 'We could not reach the server. Check your connection and try again.',
      );
    }
  }

  if (sentTo) {
    return (
      <>
        <Seo
          title="Check your email"
          description="A password reset link has been sent."
          path="/forgot-password"
          noIndex
        />
        <AuthLayout
          title="Check your email"
          subtitle={
            <>
              If an account exists for <span className="font-semibold text-ink-900">{sentTo}</span>,
              a reset link is on its way. It expires in 30 minutes.
            </>
          }
          footer={
            <Link
              to="/login"
              className="flex items-center justify-center gap-1.5 text-sm font-semibold text-brand-600 transition hover:text-brand-700"
            >
              <ArrowLeft className="size-4" aria-hidden="true" />
              Back to sign in
            </Link>
          }
        >
          <div className="space-y-5">
            <div className="flex items-center justify-center rounded-2xl bg-valid-50 py-10 ring-1 ring-inset ring-valid-100">
              <MailCheck className="size-12 text-valid-600" aria-hidden="true" />
            </div>

            <Alert tone="info">
              Nothing arrived? Check your spam folder, or{' '}
              <button
                type="button"
                onClick={() => setSentTo(null)}
                className="font-semibold underline underline-offset-2"
              >
                try a different address
              </button>
              .
            </Alert>
          </div>
        </AuthLayout>
      </>
    );
  }

  return (
    <>
      <Seo
        title="Reset your password"
        description="Request a password reset link for your SkillSeal account."
        path="/forgot-password"
        noIndex
      />

      <AuthLayout
        title="Reset your password"
        subtitle="Enter the email on your account and we will send you a link to set a new password."
        footer={
          <Link
            to="/login"
            className="flex items-center justify-center gap-1.5 text-sm font-semibold text-brand-600 transition hover:text-brand-700"
          >
            <ArrowLeft className="size-4" aria-hidden="true" />
            Back to sign in
          </Link>
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
            defaultValue={getValues('email')}
            {...register('email')}
          />

          <Button
            type="submit"
            size="lg"
            fullWidth
            isLoading={isSubmitting}
            loadingText="Sending link…"
          >
            <Send className="size-4" aria-hidden="true" />
            Send reset link
          </Button>
        </form>
      </AuthLayout>
    </>
  );
}
