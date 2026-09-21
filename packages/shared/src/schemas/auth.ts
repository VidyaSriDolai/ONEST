import { z } from 'zod';
import { SELF_SIGNUP_ROLES } from '../roles.js';
import { PASSWORD_MAX_LENGTH, PASSWORD_POLICY_MESSAGE, assessPassword } from '../password.js';

export const emailSchema = z
  .string()
  .trim()
  .min(1, 'Email is required')
  .max(254, 'Email is too long')
  .email('Enter a valid email address')
  .transform((v) => v.toLowerCase());

export const passwordSchema = z
  .string()
  .max(PASSWORD_MAX_LENGTH, 'Password is too long')
  .refine((v) => assessPassword(v).acceptable, PASSWORD_POLICY_MESSAGE);

export const loginSchema = z.object({
  email: emailSchema,
  // Deliberately not policy-checked: an existing password only has to match.
  password: z.string().min(1, 'Password is required').max(PASSWORD_MAX_LENGTH),
  rememberMe: z.boolean().optional().default(false),
});
export type LoginInput = z.infer<typeof loginSchema>;

export const registerSchema = z
  .object({
    fullName: z.string().trim().min(2, 'Enter your full name').max(120, 'Name is too long'),
    email: emailSchema,
    password: passwordSchema,
    confirmPassword: z.string(),
    role: z.enum(SELF_SIGNUP_ROLES, {
      errorMap: () => ({ message: 'Choose how you will use the platform' }),
    }),
    organizationName: z.string().trim().max(160).optional(),
    acceptTerms: z.literal(true, {
      errorMap: () => ({ message: 'You must accept the terms to continue' }),
    }),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  })
  .refine((data) => data.role === 'STUDENT' || Boolean(data.organizationName?.length), {
    message: 'Organization name is required for this account type',
    path: ['organizationName'],
  });
export type RegisterInput = z.infer<typeof registerSchema>;

export const forgotPasswordSchema = z.object({ email: emailSchema });
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;

export const resetPasswordSchema = z
  .object({
    token: z.string().min(1, 'Reset token is missing'),
    password: passwordSchema,
    confirmPassword: z.string(),
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;
