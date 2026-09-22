import type {
  AuthSession,
  ForgotPasswordInput,
  LoginInput,
  PublicUser,
  RegisterInput,
  ResetPasswordInput,
} from '@skillseal/shared';
import { api } from '@/lib/api-client';

/** Shared across every caller so refresh can never be issued twice at once. */
let inFlightRefresh: Promise<AuthSession> | null = null;

export const authApi = {
  login: (input: LoginInput) => api.post<AuthSession>('/api/auth/login', input),

  register: (input: RegisterInput) => api.post<AuthSession>('/api/auth/register', input),

  logout: () => api.post<{ loggedOut: boolean }>('/api/auth/logout'),

  me: () => api.get<PublicUser>('/api/auth/me'),

  /**
   * Turns the httpOnly refresh cookie into a live session.
   *
   * De-duplicated at module level: refresh tokens rotate, so two concurrent
   * calls would make the second present an already-rotated token — which the
   * server correctly treats as a leaked-token replay and responds to by
   * revoking the whole family. That happens for real whenever two tabs boot
   * together, and in development on every mount because React StrictMode
   * double-invokes effects. Sharing one in-flight promise removes the race at
   * the source rather than weakening the server's detection.
   */
  refresh: (): Promise<AuthSession> => {
    inFlightRefresh ??= api
      .post<AuthSession>('/api/auth/refresh', undefined, { skipRefresh: true })
      .finally(() => {
        inFlightRefresh = null;
      });
    return inFlightRefresh;
  },

  forgotPassword: (input: ForgotPasswordInput) =>
    api.post<{ message: string }>('/api/auth/forgot-password', input),

  resetPassword: (input: ResetPasswordInput) =>
    api.post<{ message: string }>('/api/auth/reset-password', input),
};
