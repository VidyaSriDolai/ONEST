import { ROLES } from '@skillseal/shared';
import { prisma } from '../../lib/prisma.js';
import { logger } from '../../lib/logger.js';
import { AppError } from '../../lib/errors.js';
import { fakeVerify, hashPassword, verifyPassword } from '../../lib/password.js';
import {
  accessTokenTtlSeconds,
  generateOpaqueToken,
  hashToken,
  refreshTokenExpiry,
  signAccessToken,
} from '../../lib/tokens.js';
import { AUDIT_ACTIONS, recordAudit } from '../../services/audit.service.js';
import { env } from '../../config/env.js';
import type { Prisma, PrismaClient } from '@prisma/client';

const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_MINUTES = 15;
const RESET_TOKEN_TTL_MINUTES = 30;

/**
 * How long after rotation a refresh token is still tolerated before its reuse
 * counts as a replay. Long enough to absorb concurrent tabs and retries, far
 * too short to be useful to an attacker holding a stolen token.
 */
const REFRESH_REUSE_GRACE_MS = 15_000;

export interface RequestContext {
  ipAddress?: string;
  userAgent?: string;
}

export interface PublicUser {
  id: string;
  email: string;
  fullName: string;
  role: string;
  organizationName: string | null;
  emailVerified: boolean;
  createdAt: string;
}

export interface Session {
  user: PublicUser;
  accessToken: string;
  expiresIn: number;
}

type UserLike = {
  id: string;
  email: string;
  fullName: string;
  role: string;
  emailVerified: boolean;
  isActive: boolean;
  createdAt: Date;
  organization?: { name: string } | null;
};

type DbClient = PrismaClient | Prisma.TransactionClient;

export function toPublicUser(
  user: {
    id: string;
    email: string;
    fullName: string;
    role: string;
    emailVerified: boolean;
    createdAt: Date;
    organization?: { name: string } | null;
  },
): PublicUser {
  return {
    id: user.id,
    email: user.email,
    fullName: user.fullName,
    role: user.role,
    organizationName: user.organization?.name ?? null,
    emailVerified: user.emailVerified,
    createdAt: user.createdAt.toISOString(),
  };
}

function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);
}

/** Issues a refresh token row and returns the raw token (shown only once). */
async function issueRefreshToken(
  userId: string,
  ctx: RequestContext,
  tx: DbClient = prisma,
): Promise<string> {
  const token = generateOpaqueToken();
  await tx.refreshToken.create({
    data: {
      tokenHash: hashToken(token),
      userId,
      expiresAt: refreshTokenExpiry(),
      ipAddress: ctx.ipAddress ?? null,
      userAgent: ctx.userAgent ?? null,
    },
  });
  return token;
}

function buildSession(user: UserLike, orgName: string | null): Session {
  return {
    user: toPublicUser({ ...user, organization: orgName ? { name: orgName } : null }),
    accessToken: signAccessToken({ sub: user.id, email: user.email, role: user.role }),
    expiresIn: accessTokenTtlSeconds(),
  };
}
interface RegisterInput {
  email: string;
  password: string;
  fullName: string;
  role: string;
  organizationName?: string | null;
}

export async function register(input: RegisterInput, ctx: RequestContext) {
  const existing = await prisma.user.findUnique({ where: { email: input.email } });
  if (existing) {
    throw AppError.conflict('EMAIL_IN_USE', 'An account with this email already exists.', {
      email: ['An account with this email already exists.'],
    });
  }

  const passwordHash = await hashPassword(input.password);
  const needsOrganization = input.role !== ROLES.STUDENT && Boolean(input.organizationName);

  // One transaction so an account is never created without its organization.
  const created = await prisma.$transaction(async (tx) => {
    let organizationId: string | null = null;
    let organizationName: string | null = null;

    if (needsOrganization && input.organizationName) {
      const baseSlug = slugify(input.organizationName) || 'org';
      let slug = baseSlug;
      // Slugs are unique; disambiguate rather than failing the signup.
      let attempt = 1;
      while (await tx.organization.findUnique({ where: { slug } })) {
        slug = baseSlug + '-' + attempt;
        attempt += 1;
      }
      const org = await tx.organization.create({
        data: {
          name: input.organizationName,
          slug,
          kind: input.role === ROLES.HR ? 'EMPLOYER' : 'COMPANY',
        },
      });
      organizationId = org.id;
      organizationName = org.name;
    }

    const user = await tx.user.create({
      data: {
        email: input.email,
        passwordHash,
        fullName: input.fullName,
        role: input.role,
        organizationId,
      },
    });

    return { user, organizationName };
  });

  const refreshToken = await issueRefreshToken(created.user.id, ctx);

  await recordAudit({
    action: AUDIT_ACTIONS.REGISTER,
    userId: created.user.id,
    actorEmail: created.user.email,
    entityType: 'User',
    entityId: created.user.id,
    ipAddress: ctx.ipAddress,
    userAgent: ctx.userAgent,
    metadata: { role: created.user.role },
  });

  return {
    session: buildSession(created.user, created.organizationName),
    refreshToken,
  };
}

interface LoginInput {
  email: string;
  password: string;
}

export async function login(input: LoginInput, ctx: RequestContext) {
  const user = await prisma.user.findUnique({
    where: { email: input.email },
    include: { organization: { select: { name: true } } },
  });

  // Equalise timing so a missing account is indistinguishable from a wrong password.
  if (!user) {
    await fakeVerify();
    await recordAudit({
      action: AUDIT_ACTIONS.LOGIN_FAILED,
      actorEmail: input.email,
      ipAddress: ctx.ipAddress,
      userAgent: ctx.userAgent,
      metadata: { reason: 'NO_SUCH_USER' },
    });
    throw AppError.invalidCredentials();
  }

  if (user.lockedUntil && user.lockedUntil > new Date()) {
    const minutes = Math.ceil((user.lockedUntil.getTime() - Date.now()) / 60_000);
    const plural = minutes === 1 ? '' : 's';
    throw AppError.rateLimited(
      'Too many failed attempts. This account is locked for another ' +
        minutes +
        ' minute' +
        plural +
        '.',
    );
  }

  if (!user.isActive) {
    throw new AppError(403, 'ACCOUNT_DISABLED', 'This account has been deactivated. Contact your administrator.');
  }

  const valid = await verifyPassword(input.password, user.passwordHash);
  if (!valid) {
    const failedAttempts = user.failedAttempts + 1;
    const shouldLock = failedAttempts >= MAX_FAILED_ATTEMPTS;

    await prisma.user.update({
      where: { id: user.id },
      data: {
        failedAttempts,
        lockedUntil: shouldLock ? new Date(Date.now() + LOCKOUT_MINUTES * 60_000) : null,
      },
    });

    await recordAudit({
      action: shouldLock ? AUDIT_ACTIONS.ACCOUNT_LOCKED : AUDIT_ACTIONS.LOGIN_FAILED,
      userId: user.id,
      actorEmail: user.email,
      ipAddress: ctx.ipAddress,
      userAgent: ctx.userAgent,
      metadata: { failedAttempts },
    });
    throw AppError.invalidCredentials();
  }

  const [updated, refreshToken] = await Promise.all([
    prisma.user.update({
      where: { id: user.id },
      data: { failedAttempts: 0, lockedUntil: null, lastLoginAt: new Date() },
    }),
    issueRefreshToken(user.id, ctx),
  ]);

  await recordAudit({
    action: AUDIT_ACTIONS.LOGIN,
    userId: user.id,
    actorEmail: user.email,
    ipAddress: ctx.ipAddress,
    userAgent: ctx.userAgent,
  });

  return { session: buildSession(updated, user.organization?.name ?? null), refreshToken };
}

/**
 * Rotating refresh: the presented token is revoked and replaced. If a token
 * that was already rotated is presented again, the whole family is revoked --
 * that pattern means the token leaked.
 */
export async function refresh(rawToken: string, ctx: RequestContext) {
  const tokenHash = hashToken(rawToken);
  const stored = await prisma.refreshToken.findUnique({
    where: { tokenHash },
    include: { user: { include: { organization: { select: { name: true } } } } },
  });
  if (!stored) throw AppError.sessionExpired();

  if (stored.revokedAt) {
    // Grace window. A token presented moments after it rotated is almost
    // always a benign race — two tabs booting together, a retried request, or
    // React StrictMode double-invoking an effect — not an attacker replaying a
    // stolen token days later. Destroying the session for that is a bad trade,
    // so within the window we simply issue a fresh token instead.
    //
    // `replacedBy` is what makes this safe: it is set only when a token is
    // superseded by normal rotation. Tokens killed as part of a family
    // revocation leave it null, so they can never be walked back in through
    // this path — without that check, the grace window would silently undo the
    // very revocation it is meant to sit alongside.
    const sinceRevoked = Date.now() - stored.revokedAt.getTime();
    const wasRotated = stored.replacedBy !== null;
    if (wasRotated && sinceRevoked <= REFRESH_REUSE_GRACE_MS) {
      const graceToken = await issueRefreshToken(stored.userId, ctx);
      return {
        session: buildSession(stored.user, stored.user.organization?.name ?? null),
        refreshToken: graceToken,
      };
    }

    await prisma.refreshToken.updateMany({
      where: { userId: stored.userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
    await recordAudit({
      action: AUDIT_ACTIONS.TOKEN_REUSE_DETECTED,
      userId: stored.userId,
      actorEmail: stored.user.email,
      ipAddress: ctx.ipAddress,
      userAgent: ctx.userAgent,
      metadata: { secondsSinceRotation: Math.round(sinceRevoked / 1000) },
    });
    throw AppError.sessionExpired('Your session was ended for security reasons. Please sign in again.');
  }

  if (stored.expiresAt <= new Date()) throw AppError.sessionExpired();
  if (!stored.user.isActive) {
    throw new AppError(403, 'ACCOUNT_DISABLED', 'This account has been deactivated.');
  }

  const nextToken = await prisma.$transaction(async (tx) => {
    const next = await issueRefreshToken(stored.userId, ctx, tx);
    await tx.refreshToken.update({
      where: { id: stored.id },
      data: { revokedAt: new Date(), replacedBy: hashToken(next) },
    });
    return next;
  });

  await recordAudit({
    action: AUDIT_ACTIONS.TOKEN_REFRESHED,
    userId: stored.userId,
    actorEmail: stored.user.email,
    ipAddress: ctx.ipAddress,
    userAgent: ctx.userAgent,
  });

  return {
    session: buildSession(stored.user, stored.user.organization?.name ?? null),
    refreshToken: nextToken,
  };
}

export async function logout(rawToken: string | undefined, ctx: RequestContext): Promise<void> {
  if (!rawToken) return;
  const stored = await prisma.refreshToken.findUnique({
    where: { tokenHash: hashToken(rawToken) },
  });
  if (!stored || stored.revokedAt) return;

  await prisma.refreshToken.update({
    where: { id: stored.id },
    data: { revokedAt: new Date() },
  });

  await recordAudit({
    action: AUDIT_ACTIONS.LOGOUT,
    userId: stored.userId,
    ipAddress: ctx.ipAddress,
    userAgent: ctx.userAgent,
  });
}

export async function getCurrentUser(userId: string): Promise<PublicUser> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { organization: { select: { name: true } } },
  });
  if (!user || !user.isActive) throw AppError.unauthenticated();
  return toPublicUser(user);
}

interface ForgotPasswordInput {
  email: string;
}

/**
 * Always resolves, whether or not the email exists -- the endpoint must not
 * reveal which addresses have accounts.
 */
export async function requestPasswordReset(input: ForgotPasswordInput, ctx: RequestContext): Promise<void> {
  const user = await prisma.user.findUnique({ where: { email: input.email } });
  if (!user || !user.isActive) return;

  const token = generateOpaqueToken(32);
  await prisma.passwordResetToken.create({
    data: {
      tokenHash: hashToken(token),
      userId: user.id,
      expiresAt: new Date(Date.now() + RESET_TOKEN_TTL_MINUTES * 60_000),
    },
  });

  await recordAudit({
    action: AUDIT_ACTIONS.PASSWORD_RESET_REQUESTED,
    userId: user.id,
    actorEmail: user.email,
    ipAddress: ctx.ipAddress,
    userAgent: ctx.userAgent,
  });

  // TODO(email): send through the transactional mail provider. Until that is
  // wired up the link is logged so the flow is testable end to end in dev.
  logger.info(
    {
      resetUrl: env.WEB_APP_URL + '/reset-password?token=' + token,
      email: user.email,
    },
    'Password reset link generated',
  );
}

interface ResetPasswordInput {
  token: string;
  password: string;
}

export async function resetPassword(input: ResetPasswordInput, ctx: RequestContext): Promise<void> {
  const stored = await prisma.passwordResetToken.findUnique({
    where: { tokenHash: hashToken(input.token) },
    include: { user: true },
  });
  if (!stored || stored.usedAt || stored.expiresAt <= new Date()) {
    throw AppError.badRequest('This reset link is invalid or has expired. Request a new one.', {
      token: ['This reset link is invalid or has expired.'],
    });
  }

  const passwordHash = await hashPassword(input.password);
  await prisma.$transaction([
    prisma.user.update({
      where: { id: stored.userId },
      data: { passwordHash, failedAttempts: 0, lockedUntil: null },
    }),
    prisma.passwordResetToken.update({
      where: { id: stored.id },
      data: { usedAt: new Date() },
    }),
    // Changing a password ends every other session.
    prisma.refreshToken.updateMany({
      where: { userId: stored.userId, revokedAt: null },
      data: { revokedAt: new Date() },
    }),
  ]);

  await recordAudit({
    action: AUDIT_ACTIONS.PASSWORD_RESET_COMPLETED,
    userId: stored.userId,
    actorEmail: stored.user.email,
    ipAddress: ctx.ipAddress,
    userAgent: ctx.userAgent,
  });
}
