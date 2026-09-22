import { prisma } from '../../lib/prisma.js';
import { AppError } from '../../lib/errors.js';

export async function getDashboard() {
  const [users, organizations, courses, certificates, verifications, byRole, onest] =
    await Promise.all([
      prisma.user.count(),
      prisma.organization.count(),
      prisma.course.count(),
      prisma.certificate.count(),
      prisma.verificationLog.count(),
      prisma.user.groupBy({ by: ['role'], _count: true }),
      prisma.certificate.groupBy({ by: ['onestStatus'], _count: true }),
    ]);

  // Last 14 days of verifications. Empty days are included so the chart does
  // not misleadingly compress quiet periods.
  const since = new Date();
  since.setDate(since.getDate() - 13);
  since.setHours(0, 0, 0, 0);

  const logs = await prisma.verificationLog.findMany({
    where: { createdAt: { gte: since } },
    select: { createdAt: true },
  });
  const verificationsPerDay: Array<{ day: string; count: number }> = [];
  for (let offset = 0; offset < 14; offset += 1) {
    const start = new Date(since);
    start.setDate(since.getDate() + offset);
    const end = new Date(start);
    end.setDate(start.getDate() + 1);
    verificationsPerDay.push({
      day: start.toLocaleDateString(undefined, { day: 'numeric', month: 'short' }),
      count: logs.filter((l) => l.createdAt >= start && l.createdAt < end).length,
    });
  }

  const issued = await prisma.certificate.findMany({ select: { issuedAt: true } });
  const certificatesPerMonth: Array<{ month: string; count: number }> = [];
  const now = new Date();
  for (let offset = 5; offset >= 0; offset -= 1) {
    const point = new Date(now.getFullYear(), now.getMonth() - offset, 1);
    const next = new Date(point.getFullYear(), point.getMonth() + 1, 1);
    certificatesPerMonth.push({
      month: point.toLocaleString(undefined, { month: 'short' }),
      count: issued.filter((c) => c.issuedAt >= point && c.issuedAt < next).length,
    });
  }

  return {
    stats: { users, organizations, courses, certificates, verifications },
    usersByRole: byRole.map((r) => ({ role: r.role, count: r._count })),
    verificationsPerDay,
    certificatesPerMonth,
    onestSummary: onest.map((o) => ({ status: o.onestStatus, count: o._count })),
  };
}

export async function listUsers(search?: string) {
  const users = await prisma.user.findMany({
    include: { organization: { select: { name: true } } },
    orderBy: { createdAt: 'desc' },
    take: 200,
  });
  const term = search?.toLowerCase();
  return users
    .filter((user) =>
      term
        ? user.fullName.toLowerCase().includes(term) || user.email.toLowerCase().includes(term)
        : true,
    )
    .map((user) => ({
      id: user.id,
      fullName: user.fullName,
      email: user.email,
      role: user.role,
      organizationName: user.organization?.name ?? null,
      isActive: user.isActive,
      lastLoginAt: user.lastLoginAt?.toISOString() ?? null,
      createdAt: user.createdAt.toISOString(),
    }));
}

export async function setUserActive(
  actingUserId: string,
  userId: string,
  isActive: boolean,
): Promise<void> {
  // Locking yourself out of the admin console is never the intent.
  if (actingUserId === userId && !isActive) {
    throw AppError.badRequest('You cannot deactivate your own account.');
  }
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw AppError.notFound('That user could not be found.');

  await prisma.user.update({ where: { id: userId }, data: { isActive } });

  // Deactivating must also end any live session, or the user keeps working
  // until their refresh token happens to expire.
  if (!isActive) {
    await prisma.refreshToken.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  await prisma.auditLog.create({
    data: {
      action: isActive ? 'USER_ACTIVATED' : 'USER_DEACTIVATED',
      userId: actingUserId,
      entityType: 'User',
      entityId: userId,
      metadata: JSON.stringify({ email: user.email }),
    },
  });
}

export async function changeUserRole(
  actingUserId: string,
  userId: string,
  role: string,
): Promise<void> {
  if (actingUserId === userId) {
    throw AppError.badRequest('You cannot change your own role.');
  }
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw AppError.notFound('That user could not be found.');

  await prisma.user.update({ where: { id: userId }, data: { role } });

  // A role change alters what every existing token is allowed to do, so the
  // old sessions must go.
  await prisma.refreshToken.updateMany({
    where: { userId, revokedAt: null },
    data: { revokedAt: new Date() },
  });

  await prisma.auditLog.create({
    data: {
      action: 'USER_ROLE_CHANGED',
      userId: actingUserId,
      entityType: 'User',
      entityId: userId,
      metadata: JSON.stringify({ from: user.role, to: role, email: user.email }),
    },
  });
}

export async function listOrganizations() {
  const organizations = await prisma.organization.findMany({
    include: { _count: { select: { users: true, courses: true, certificates: true } } },
    orderBy: { createdAt: 'desc' },
  });
  return organizations.map((organization) => ({
    id: organization.id,
    name: organization.name,
    slug: organization.slug,
    kind: organization.kind,
    isActive: organization.isActive,
    userCount: organization._count.users,
    courseCount: organization._count.courses,
    certificateCount: organization._count.certificates,
    createdAt: organization.createdAt.toISOString(),
  }));
}

export interface AuditLogFilters {
  action?: string;
  from?: string;
  to?: string;
  search?: string;
}

export async function listAuditLogs(filters: AuditLogFilters = {}) {
  const logs = await prisma.auditLog.findMany({
    where: {
      ...(filters.action ? { action: filters.action } : {}),
      ...(filters.from || filters.to
        ? {
            createdAt: {
              ...(filters.from ? { gte: new Date(filters.from) } : {}),
              ...(filters.to ? { lte: new Date(filters.to + 'T23:59:59.999Z') } : {}),
            },
          }
        : {}),
    },
    include: { user: { select: { email: true } } },
    orderBy: { createdAt: 'desc' },
    take: 250,
  });

  const term = filters.search?.toLowerCase();
  return logs
    .map((log) => ({
      id: log.id,
      action: log.action,
      actorEmail: log.actorEmail ?? log.user?.email ?? null,
      entityType: log.entityType,
      entityId: log.entityId,
      ipAddress: log.ipAddress,
      metadata: log.metadata,
      createdAt: log.createdAt.toISOString(),
    }))
    .filter((log) => (term ? (log.actorEmail ?? '').toLowerCase().includes(term) : true));
}

export async function listAuditActions(): Promise<string[]> {
  const rows = await prisma.auditLog.findMany({
    select: { action: true },
    distinct: ['action'],
    orderBy: { action: 'asc' },
  });
  return rows.map((r) => r.action);
}

export async function listOnestSync() {
  const certificates = await prisma.certificate.findMany({
    orderBy: { issuedAt: 'desc' },
    take: 100,
  });
  return certificates.map((certificate) => ({
    certificateId: certificate.certificateId,
    holderName: certificate.holderName,
    trackName: certificate.trackName,
    onestStatus: certificate.onestStatus,
    onestPublishedAt: certificate.onestPublishedAt?.toISOString() ?? null,
    onestError: certificate.onestError,
  }));
}

/**
 * Marks a failed or pending publication as published.
 *
 * TODO(onest): this is a stand-in until the Beckn BPP adapter exists. When it
 * does, this should enqueue a real `on_status` publication rather than setting
 * the column directly.
 */
export async function retryOnestSync(actingUserId: string, certificateId: string): Promise<void> {
  const certificate = await prisma.certificate.findUnique({ where: { certificateId } });
  if (!certificate) throw AppError.notFound('That certificate could not be found.');

  await prisma.certificate.update({
    where: { id: certificate.id },
    data: { onestStatus: 'PUBLISHED', onestPublishedAt: new Date(), onestError: null },
  });

  await prisma.auditLog.create({
    data: {
      action: 'ONEST_SYNC_RETRIED',
      userId: actingUserId,
      entityType: 'Certificate',
      entityId: certificate.id,
      metadata: JSON.stringify({ certificateId }),
    },
  });
}

export async function getReports() {
  const courses = await prisma.course.findMany({
    include: {
      enrollments: { select: { status: true } },
      assessments: { include: { attempts: { where: { submittedAt: { not: null } } } } },
    },
  });

  const verification = (
    await prisma.verificationLog.groupBy({ by: ['result'], _count: true })
  ).map((row) => ({ result: row.result, count: row._count }));

  return {
    enrollment: courses.map((course) => {
      const completed = course.enrollments.filter((e) => e.status === 'COMPLETED').length;
      return {
        course: course.title,
        enrolled: course.enrollments.length,
        completed,
        rate:
          course.enrollments.length === 0
            ? 0
            : Math.round((completed / course.enrollments.length) * 100),
      };
    }),
    assessment: courses.map((course) => {
      const attempts = course.assessments.flatMap((a) => a.attempts);
      const scores = attempts.map((a) => a.score ?? 0);
      return {
        course: course.title,
        attempts: attempts.length,
        passed: attempts.filter((a) => a.passed).length,
        averageScore:
          scores.length === 0
            ? 0
            : Math.round(scores.reduce((sum, s) => sum + s, 0) / scores.length),
      };
    }),
    verification,
  };
}
