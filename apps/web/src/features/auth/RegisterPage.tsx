import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Controller, useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Building2, GraduationCap, Lock, Mail, UserPlus, Users } from 'lucide-react';
import {
  ROLES,
  ROLE_HOME,
  registerSchema,
  type RegisterInput,
  type SelfSignupRole,
} from '@skillseal/shared';
import { AuthLayout } from '@/components/layout/AuthLayout';
import { Seo } from '@/components/seo/Seo';
import { Alert } from '@/components/ui/Alert';
import { Button } from '@/components/ui/Button';
import { Checkbox, PasswordField, TextField } from '@/components/ui/Field';
import { PasswordStrengthMeter } from '@/components/ui/PasswordStrength';
import { ApiError } from '@/lib/api-client';
import { cn } from '@/lib/cn';
import { useAuth } from './AuthProvider';

/** The spec calls for role cards with icons rather than a dropdown. */
const ROLE_CARDS: Array<{
  value: SelfSignupRole;
  icon: typeof GraduationCap;
  title: string;
  description: string;
}> = [
  {
    value: ROLES.STUDENT,
    icon: GraduationCap,
    title: 'Learner',
    description: 'Take courses, sit assessments and earn certifications.',
  },
  {
    value: ROLES.COMPANY,
    icon: Building2,
    title: 'Training provider',
    description: 'Publish courses, build tracks and issue certificates.',
  },
  {
    value: ROLES.HR,
    icon: Users,
    title: 'Employer / HR',
    description: 'Verify candidate credentials and manage API access.',
  },
];

export default function RegisterPage() {
  const { register: registerAccount } = useAuth();
  const navigate = useNavigate();
  const [formError, setFormError] = useState<string | null>(null);

  const {
    register,
    control,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<RegisterInput>({
    resolver: zodResolver(registerSchema),
    mode: 'onBlur',
    defaultValues: {
      fullName: '',
      email: '',
      password: '',
      confirmPassword: '',
      role: ROLES.STUDENT,
      organizationName: '',
      acceptTerms: false as unknown as true,
    },
  });

  // Watched so the meter and the conditional org field react as the user types.
  const password = useWatch({ control, name: 'password' });
  const selectedRole = useWatch({ control, name: 'role' });
  const needsOrganization = selectedRole !== ROLES.STUDENT;

  async function onSubmit(values: RegisterInput) {
    setFormError(null);
    try {
      const user = await registerAccount(values);
      navigate(ROLE_HOME[user.role], { replace: true });
    } catch (error) {
      if (error instanceof ApiError) {
        if (error.details) {
          let mapped = false;
          for (const [field, messages] of Object.entries(error.details)) {
            if (field in values && messages[0]) {
              setError(field as keyof RegisterInput, { message: messages[0] });
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
        title="Create an account"
        description="Create a SkillSeal account as a learner, training provider or employer and start issuing or verifying industry-recognised certifications."
        path="/register"
      />

      <AuthLayout
        title="Create your account"
        subtitle="Tell us how you will use SkillSeal and we will set up the right workspace."
        footer={
          <p className="text-center text-sm text-ink-600">
            Already have an account?{' '}
            <Link to="/login" className="font-semibold text-brand-600 hover:text-brand-700">
              Sign in
            </Link>
          </p>
        }
      >
        <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-6">
          {formError && <Alert tone="error">{formError}</Alert>}

          {/* Role selection -------------------------------------------- */}
          <Controller
            control={control}
            name="role"
            render={({ field }) => (
              <fieldset>
                <legend className="text-sm font-medium text-ink-800">I am joining as</legend>
                <div className="mt-2.5 grid gap-2.5">
                  {ROLE_CARDS.map((card) => {
                    const isSelected = field.value === card.value;
                    return (
                      <label
                        key={card.value}
                        className={cn(
                          'flex cursor-pointer items-start gap-3.5 rounded-xl p-3.5 ring-1 ring-inset transition-all duration-200',
                          isSelected
                            ? 'bg-brand-50 ring-2 ring-brand-500'
                            : 'bg-surface ring-ink-200 hover:bg-ink-50 hover:ring-ink-300',
                        )}
                      >
                        <input
                          type="radio"
                          value={card.value}
                          checked={isSelected}
                          onChange={() => field.onChange(card.value)}
                          onBlur={field.onBlur}
                          name={field.name}
                          className="sr-only"
                        />
                        <span
                          className={cn(
                            'flex size-10 shrink-0 items-center justify-center rounded-lg transition',
                            isSelected
                              ? 'bg-brand-600 text-white'
                              : 'bg-ink-100 text-ink-500',
                          )}
                          aria-hidden="true"
                        >
                          <card.icon className="size-5" />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span
                            className={cn(
                              'block text-sm font-semibold',
                              isSelected ? 'text-brand-900' : 'text-ink-900',
                            )}
                          >
                            {card.title}
                          </span>
                          <span className="mt-0.5 block text-xs leading-relaxed text-ink-600">
                            {card.description}
                          </span>
                        </span>
                        <span
                          className={cn(
                            'mt-1 size-4.5 shrink-0 rounded-full ring-1 ring-inset transition',
                            isSelected
                              ? 'bg-brand-600 ring-brand-600'
                              : 'bg-surface ring-ink-300',
                          )}
                          aria-hidden="true"
                        >
                          {isSelected && (
                            <svg viewBox="0 0 16 16" className="size-full p-0.5" fill="none">
                              <path
                                d="m4 8.5 2.5 2.5L12 5.5"
                                stroke="white"
                                strokeWidth="2"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                              />
                            </svg>
                          )}
                        </span>
                      </label>
                    );
                  })}
                </div>
                {errors.role && (
                  <p className="mt-1.5 text-xs font-medium text-danger-600" role="alert">
                    {errors.role.message}
                  </p>
                )}
              </fieldset>
            )}
          />

          {/* Identity --------------------------------------------------- */}
          <TextField
            label="Full name"
            autoComplete="name"
            placeholder="Ananya Rao"
            error={errors.fullName?.message}
            required
            {...register('fullName')}
          />

          {needsOrganization && (
            <div className="animate-fade-in">
              <TextField
                label={selectedRole === ROLES.HR ? 'Company name' : 'Organization name'}
                autoComplete="organization"
                placeholder={
                  selectedRole === ROLES.HR ? 'Acme Technologies' : 'Infosys Springboard'
                }
                icon={<Building2 className="size-4.5" />}
                error={errors.organizationName?.message}
                required
                {...register('organizationName')}
              />
            </div>
          )}

          <TextField
            label="Work email"
            type="email"
            autoComplete="email"
            placeholder="you@company.com"
            icon={<Mail className="size-4.5" />}
            error={errors.email?.message}
            required
            {...register('email')}
          />

          {/* Credentials ------------------------------------------------ */}
          <PasswordField
            label="Password"
            autoComplete="new-password"
            placeholder="Create a strong password"
            icon={<Lock className="size-4.5" />}
            error={errors.password?.message}
            required
            footer={<PasswordStrengthMeter value={password ?? ''} />}
            {...register('password')}
          />

          <PasswordField
            label="Confirm password"
            autoComplete="new-password"
            placeholder="Re-enter your password"
            icon={<Lock className="size-4.5" />}
            error={errors.confirmPassword?.message}
            required
            {...register('confirmPassword')}
          />

          <Checkbox
            label={
              <>
                I agree to the{' '}
                <Link to="/" className="font-medium text-brand-600 hover:text-brand-700">
                  Terms of Service
                </Link>{' '}
                and{' '}
                <Link to="/" className="font-medium text-brand-600 hover:text-brand-700">
                  Privacy Policy
                </Link>
                .
              </>
            }
            error={errors.acceptTerms?.message}
            {...register('acceptTerms')}
          />

          <Button
            type="submit"
            size="lg"
            fullWidth
            isLoading={isSubmitting}
            loadingText="Creating your account…"
          >
            <UserPlus className="size-4" aria-hidden="true" />
            Create account
          </Button>
        </form>
      </AuthLayout>
    </>
  );
}
