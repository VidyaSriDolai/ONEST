import { prisma } from '../../lib/prisma.js';
import { AppError } from '../../lib/errors.js';

export async function getDashboard(organizationId: string) {
  const courses = await prisma.course.findMany({
    where: { providerOrgId: organizationId },
    include: { enrollments: { select: { userId: true, status: true, enrolledAt: true } } },
  });
  const allEnrollments = courses.flatMap((c) => c.enrollments);
  const completed = allEnrollments.filter((e) => e.status === 'COMPLETED').length;

  // Last six months, oldest first, with empty months kept so the chart has a
  // continuous x-axis rather than skipping quiet periods.
  const months: Array<{ month: string; count: number }> = [];
  const now = new Date();
  for (let offset = 5; offset >= 0; offset -= 1) {
    const point = new Date(now.getFullYear(), now.getMonth() - offset, 1);
    const next = new Date(point.getFullYear(), point.getMonth() + 1, 1);
    months.push({
      month: point.toLocaleString(undefined, { month: 'short' }),
      count: allEnrollments.filter((e) => e.enrolledAt >= point && e.enrolledAt < next).length,
    });
  }

  const certificatesIssued = await prisma.certificate.count({
    where: { issuerOrgId: organizationId },
  });

  return {
    stats: {
      courses: courses.length,
      publishedCourses: courses.filter((c) => c.isPublished).length,
      learners: new Set(allEnrollments.map((e) => e.userId)).size,
      completionRate:
        allEnrollments.length === 0
          ? 0
          : Math.round((completed / allEnrollments.length) * 100),
      certificatesIssued,
    },
    enrollmentsOverTime: months,
    completionByCourse: courses.map((course) => ({
      course: course.title,
      enrolled: course.enrollments.length,
      completed: course.enrollments.filter((e) => e.status === 'COMPLETED').length,
    })),
  };
}

export async function listCourses(organizationId: string) {
  const courses = await prisma.course.findMany({
    where: { providerOrgId: organizationId },
    include: {
      _count: { select: { modules: true, assessments: true } },
      enrollments: { select: { status: true } },
    },
    orderBy: { createdAt: 'desc' },
  });
  return courses.map((course) => ({
    id: course.id,
    slug: course.slug,
    title: course.title,
    category: course.category,
    level: course.level,
    isPublished: course.isPublished,
    moduleCount: course._count.modules,
    enrolledCount: course.enrollments.length,
    completedCount: course.enrollments.filter((e) => e.status === 'COMPLETED').length,
    hasAssessment: course._count.assessments > 0,
    createdAt: course.createdAt.toISOString(),
  }));
}

function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);
}

export interface CreateCourseInput {
  title: string;
  description: string;
  category: string;
  level: string;
  durationHours: number;
  modules: Array<{ title: string; content: string; durationMinutes: number }>;
  prerequisiteIds: string[];
  skillIds: string[];
  publish: boolean;
}

export async function createCourse(organizationId: string, input: CreateCourseInput) {
  const base = slugify(input.title) || 'course';
  let slug = base;
  let attempt = 1;
  while (await prisma.course.findUnique({ where: { slug } })) {
    slug = base + '-' + attempt;
    attempt += 1;
  }

  const course = await prisma.$transaction(async (tx) => {
    const created = await tx.course.create({
      data: {
        slug,
        title: input.title,
        description: input.description,
        category: input.category,
        level: input.level,
        durationHours: input.durationHours,
        isPublished: input.publish,
        providerOrgId: organizationId,
      },
    });

    if (input.modules.length > 0) {
      await tx.module.createMany({
        data: input.modules.map((module, index) => ({
          courseId: created.id,
          title: module.title,
          content: module.content,
          orderIndex: index,
          durationMinutes: module.durationMinutes,
        })),
      });
    }

    // Only prerequisites owned by this organisation may be referenced, so a
    // provider cannot make their course depend on a competitor's.
    if (input.prerequisiteIds.length > 0) {
      const owned = await tx.course.findMany({
        where: { id: { in: input.prerequisiteIds }, providerOrgId: organizationId },
        select: { id: true },
      });
      await tx.coursePrerequisite.createMany({
        data: owned.map((p) => ({ courseId: created.id, prerequisiteId: p.id })),
      });
    }

    if (input.skillIds.length > 0) {
      await tx.courseSkill.createMany({
        data: input.skillIds.map((skillId) => ({ courseId: created.id, skillId })),
      });
    }

    return created;
  });

  return { id: course.id, slug: course.slug };
}

export async function setCoursePublished(
  organizationId: string,
  courseId: string,
  isPublished: boolean,
): Promise<void> {
  const result = await prisma.course.updateMany({
    where: { id: courseId, providerOrgId: organizationId },
    data: { isPublished },
  });
  if (result.count === 0) throw AppError.notFound('That course could not be found.');
}

export async function listLearners(organizationId: string, courseSlug?: string) {
  const enrollments = await prisma.enrollment.findMany({
    where: {
      course: {
        providerOrgId: organizationId,
        ...(courseSlug ? { slug: courseSlug } : {}),
      },
    },
    include: {
      user: { select: { id: true, fullName: true, email: true } },
      course: { select: { id: true, title: true, slug: true } },
    },
    orderBy: { enrolledAt: 'desc' },
  });

  // Best score per (user, course), fetched in one query.
  const attempts = await prisma.assessmentAttempt.findMany({
    where: {
      submittedAt: { not: null },
      assessment: { course: { providerOrgId: organizationId } },
    },
    include: { assessment: { select: { courseId: true } } },
  });
  const bestScores = new Map<string, number>();
  for (const attempt of attempts) {
    const key = attempt.userId + ':' + attempt.assessment.courseId;
    bestScores.set(key, Math.max(bestScores.get(key) ?? 0, attempt.score ?? 0));
  }

  return enrollments.map((enrollment) => ({
    userId: enrollment.user.id,
    fullName: enrollment.user.fullName,
    email: enrollment.user.email,
    courseTitle: enrollment.course.title,
    courseSlug: enrollment.course.slug,
    status: enrollment.status,
    progressPercent: enrollment.progressPercent,
    bestScore: bestScores.get(enrollment.user.id + ':' + enrollment.course.id) ?? null,
    enrolledAt: enrollment.enrolledAt.toISOString(),
  }));
}

export async function listIssuedCertificates(organizationId: string) {
  const certificates = await prisma.certificate.findMany({
    where: { issuerOrgId: organizationId },
    orderBy: { issuedAt: 'desc' },
  });
  return certificates.map((certificate) => ({
    id: certificate.id,
    certificateId: certificate.certificateId,
    holderName: certificate.holderName,
    trackName: certificate.trackName,
    status: certificate.status,
    issuedAt: certificate.issuedAt.toISOString(),
    expiresAt: certificate.expiresAt?.toISOString() ?? null,
    revokedReason: certificate.revokedReason,
  }));
}

export async function revokeCertificate(
  organizationId: string,
  userId: string,
  certificateId: string,
  reason: string,
): Promise<void> {
  const certificate = await prisma.certificate.findFirst({
    where: { certificateId, issuerOrgId: organizationId },
  });
  if (!certificate) throw AppError.notFound('That certificate could not be found.');
  if (certificate.status === 'REVOKED') {
    throw AppError.badRequest('That certificate is already revoked.');
  }

  // Revocation sits outside the signed payload deliberately, so withdrawing a
  // credential never requires re-signing it.
  await prisma.certificate.update({
    where: { id: certificate.id },
    data: { status: 'REVOKED', revokedAt: new Date(), revokedReason: reason, revokedById: userId },
  });

  await prisma.auditLog.create({
    data: {
      action: 'CERTIFICATE_REVOKED',
      userId,
      entityType: 'Certificate',
      entityId: certificate.id,
      metadata: JSON.stringify({ certificateId, reason }),
    },
  });

  await prisma.notification.create({
    data: {
      userId: certificate.holderId,
      type: 'CERTIFICATE',
      title: 'Certificate revoked',
      body: 'Your ' + certificate.trackName + ' certificate has been revoked. ' + reason,
      link: '/student/certificates/' + certificate.certificateId,
    },
  });
}

export interface SaveAssessmentInput {
  courseId: string;
  title: string;
  passingScore: number;
  timeLimitMinutes: number;
  maxAttempts: number;
  publish: boolean;
  questions: Array<{
    text: string;
    marks: number;
    options: Array<{ text: string; isCorrect: boolean }>;
  }>;
}

export async function saveAssessment(organizationId: string, input: SaveAssessmentInput) {
  const course = await prisma.course.findFirst({
    where: { id: input.courseId, providerOrgId: organizationId },
  });
  if (!course) throw AppError.notFound('That course could not be found.');
  if (input.questions.length === 0) {
    throw AppError.badRequest('An assessment needs at least one question.');
  }
  for (const [index, question] of input.questions.entries()) {
    if (!question.options.some((o) => o.isCorrect)) {
      throw AppError.badRequest('Question ' + (index + 1) + ' has no correct answer marked.');
    }
  }

  // Replace rather than patch: editing questions in place would silently
  // invalidate the answers of attempts already in progress.
  const assessment = await prisma.$transaction(async (tx) => {
    await tx.assessment.deleteMany({ where: { courseId: course.id } });

    const created = await tx.assessment.create({
      data: {
        courseId: course.id,
        title: input.title,
        passingScore: input.passingScore,
        timeLimitMinutes: input.timeLimitMinutes,
        maxAttempts: input.maxAttempts,
        isPublished: input.publish,
      },
    });

    for (const [index, question] of input.questions.entries()) {
      await tx.question.create({
        data: {
          assessmentId: created.id,
          text: question.text,
          orderIndex: index,
          marks: question.marks,
          options: {
            create: question.options.map((option, optionIndex) => ({
              text: option.text,
              isCorrect: option.isCorrect,
              orderIndex: optionIndex,
            })),
          },
        },
      });
    }

    return created;
  });

  return { id: assessment.id };
}

export async function getAssessmentForCourse(organizationId: string, courseId: string) {
  const assessment = await prisma.assessment.findFirst({
    where: { courseId, course: { providerOrgId: organizationId } },
    include: {
      questions: {
        orderBy: { orderIndex: 'asc' },
        include: { options: { orderBy: { orderIndex: 'asc' } } },
      },
    },
  });
  if (!assessment) return null;

  return {
    courseId,
    title: assessment.title,
    passingScore: assessment.passingScore,
    timeLimitMinutes: assessment.timeLimitMinutes,
    maxAttempts: assessment.maxAttempts,
    publish: assessment.isPublished,
    questions: assessment.questions.map((question) => ({
      text: question.text,
      marks: question.marks,
      options: question.options.map((option) => ({
        text: option.text,
        isCorrect: option.isCorrect,
      })),
    })),
  };
}

export async function listTracks(organizationId: string) {
  const tracks = await prisma.certificationTrack.findMany({
    where: { issuerOrgId: organizationId },
    include: { _count: { select: { courses: true, skills: true, certificates: true } } },
    orderBy: { name: 'asc' },
  });
  return tracks.map((track) => ({
    id: track.id,
    slug: track.slug,
    name: track.name,
    nsqfLevel: track.nsqfLevel,
    minimumScore: track.minimumScore,
    courseCount: track._count.courses,
    skillCount: track._count.skills,
    certificatesIssued: track._count.certificates,
    isActive: track.isActive,
  }));
}
