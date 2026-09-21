import type { Role } from './roles.js';

export interface PublicUser {
  id: string;
  email: string;
  fullName: string;
  role: Role;
  organizationName: string | null;
  emailVerified: boolean;
  createdAt: string;
}

export interface AuthSession {
  user: PublicUser;
  accessToken: string;
  /** Seconds until the access token expires. */
  expiresIn: number;
}

/** Every successful API response is wrapped in this envelope. */
export interface ApiSuccess<T> {
  ok: true;
  data: T;
}

/** Every failed API response is wrapped in this envelope. */
export interface ApiFailure {
  ok: false;
  error: {
    code: ApiErrorCode;
    message: string;
    /** Field-level messages, keyed by form field name. */
    details?: Record<string, string[]>;
  };
}

export type ApiResponse<T> = ApiSuccess<T> | ApiFailure;

export const API_ERROR_CODES = [
  'VALIDATION_ERROR',
  'INVALID_CREDENTIALS',
  'EMAIL_IN_USE',
  'UNAUTHENTICATED',
  'SESSION_EXPIRED',
  'FORBIDDEN',
  'NOT_FOUND',
  'RATE_LIMITED',
  'ACCOUNT_DISABLED',
  'INTERNAL_ERROR',
] as const;

export type ApiErrorCode = (typeof API_ERROR_CODES)[number];
