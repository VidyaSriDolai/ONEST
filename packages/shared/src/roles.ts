/**
 * Roles are plain strings rather than a Prisma enum so the schema stays
 * portable between SQLite (local dev) and PostgreSQL (production).
 */
export const ROLES = {
  STUDENT: 'STUDENT',
  COMPANY: 'COMPANY',
  HR: 'HR',
  ADMIN: 'ADMIN',
} as const;

export type Role = (typeof ROLES)[keyof typeof ROLES];

export const ALL_ROLES = Object.values(ROLES) as Role[];

/** Roles a visitor may choose on the public registration form. */
export const SELF_SIGNUP_ROLES = [ROLES.STUDENT, ROLES.COMPANY, ROLES.HR] as const;
export type SelfSignupRole = (typeof SELF_SIGNUP_ROLES)[number];

/** Where each role lands after authenticating. */
export const ROLE_HOME: Record<Role, string> = {
  STUDENT: '/student/dashboard',
  COMPANY: '/company/dashboard',
  HR: '/hr/verify',
  ADMIN: '/admin/dashboard',
};

export const ROLE_LABEL: Record<Role, string> = {
  STUDENT: 'Learner',
  COMPANY: 'Training provider',
  HR: 'Employer / HR',
  ADMIN: 'Administrator',
};
