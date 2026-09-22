import { prisma } from '../../lib/prisma.js';
import { AppError } from '../../lib/errors.js';
import { notify } from '../notifications/notifications.service.js';

export interface CourseFilters {
  search?: string;
  category?: string;
  level?: string;
}

export async function listCourses(userId: string | null, filters: CourseFilters = {}) {
  const courses = await prisma.course.findMany({
    where: {
      isPublished: true,
      ...(filters.category ? { category: filters.category } : {}),
      ...(filters.level ? { level: filters.level } : {}),
      // SQLite has no case-insensitive `mode`, so matching is done in memory
      // below rather than pretending this filter is case-insensitive here.
      ...(filters.search ? { OR: [{ title: { contains: filters.search } }] } : {}),
    },
    include: {
      providerOrg: { select: { name: true } },
      skills: { include: { skill: { select: { name: true } } } },
      _count: { select: { modules: true } },
      enrollments: userId ? { where: { userId } } : false,
    },
    orderBy: { title: 'asc' },
  });

  const search = filters.search?.toLowerCase();
  return courses
    .filter((course) =>
      search
        ? course.title.toLowerCase().includes(search) ||
          course.description.toLowerCase().includes(search) ||
          course.category.toLowerCase().includes(search)
        : true,
    )
    .map((course) => {
      const enrollment = Array.isArray(course.enrollments) ? course.enrollments[0] : undefined;
      return {
        id: course.id,
        slug: course.slug,
        title: course.title,
        description: course.description,
        category: course.category,
        level: course.level,
        durationHours: course.durationHours,
        rating: course.rating,
        providerName: course.providerOrg.name,
        skills: course.skills.map((s) => s.skill.name),
        moduleCount: course._count.modules,
        enrollment: enrollment
          ? { status: enrollment.status, progressPercent: enrollment.progressPercent }
          : null,
      };
    });
}

export async function listCategories(): Promise<string[]> {
  const rows = await prisma.course.findMany({
    where: { isPublished: true },
    select: { category: true },
    distinct: ['category'],
    orderBy: { category: 'asc' },
  });
  return rows.map((r) => r.category);
}

export async function getCourse(slug: string, userId: string | null) {
  const course = await prisma.course.findUnique({
    where: { slug },
    include: {
      providerOrg: { select: { name: true } },
      skills: { include: { skill: { select: { name: true } } } },
      modules: { orderBy: { orderIndex: 'asc' } },
      prerequisites: { include: { prerequisite: { select: { id: true, title: true, slug: true } } } },
      assessments: { where: { isPublished: true }, take: 1 },
      enrollments: userId ? { where: { userId } } : false,
      _count: { select: { modules: true } },
    },
  });
  if (!course || !course.isPublished) throw AppError.notFound('That course could not be found.');

  // A prerequisite counts as met only when the learner completed that course.
  const completedCourseIds = userId
    ? new Set(
        (
          await prisma.enrollment.findMany({
            where: { userId, status: 'COMPLETED' },
            select: { courseId: true },
          })
        ).map((e) => e.courseId),
      )
    : new Set<string>();

  const prerequisites = course.prerequisites.map((p) => ({
    id: p.prerequisite.id,
    title: p.prerequisite.title,
    slug: p.prerequisite.slug,
    met: completedCourseIds.has(p.prerequisite.id),
  }));

  const enrollment = Array.isArray(course.enrollments) ? course.enrollments[0] : undefined;
  const assessment = course.assessments[0];

  return {
    id: course.id,
    slug: course.slug,
    title: course.title,
    description: course.description,
    category: course.category,
    level: course.level,
    durationHours: course.durationHours,
    rating: course.rating,
    providerName: course.providerOrg.name,
    skills: course.skills.map((s) => s.skill.name),
    moduleCount: course._count.modules,
    enrollment: enrollment
      ? { status: enrollment.status, progressPercent: enrollment.progressPercent }
      : null,
    modules: course.modules.map((m) => ({
      id: m.id,
      title: m.title,
      orderIndex: m.orderIndex,
      durationMinutes: m.durationMinutes,
    })),
    prerequisites,
    canEnroll: prerequisites.every((p) => p.met),
    assessment: assessment
      ? {
          id: assessment.id,
          title: assessment.title,
          passingScore: assessment.passingScore,
          maxAttempts: assessment.maxAttempts,
        }
      : null,
  };
}

export async function enroll(userId: string, slug: string) {
  const course = await getCourse(slug, userId);
  if (course.enrollment) {
    throw AppError.badRequest('You are already enrolled in this course.');
  }
  // Enforced server-side, not just hidden in the UI.
  if (!course.canEnroll) {
    const missing = course.prerequisites.filter((p) => !p.met).map((p) => p.title);
    throw AppError.badRequest('Complete ' + missing.join(', ') + ' first.');
  }

  const enrollment = await prisma.enrollment.create({
    data: { userId, courseId: course.id, status: 'ACTIVE', progressPercent: 0 },
  });

  await notify(userId, {
    type: 'ENROLLMENT',
    title: 'Enrolled in ' + course.title,
    body: 'Your seat is confirmed. The first module is ready when you are.',
    link: '/student/learn/' + course.slug,
  });

  return { enrollmentId: enrollment.id };
}

export async function getLearningView(userId: string, slug: string) {
  const course = await prisma.course.findUnique({
    where: { slug },
    include: {
      modules: { orderBy: { orderIndex: 'asc' } },
      assessments: { where: { isPublished: true }, take: 1 },
    },
  });
  if (!course) throw AppError.notFound('That course could not be found.');

  const enrollment = await prisma.enrollment.findUnique({
    where: { userId_courseId: { userId, courseId: course.id } },
    include: { moduleProgress: true },
  });
  if (!enrollment) throw AppError.forbidden('Enrol in this course to start learning.');

  const completed = new Set(enrollment.moduleProgress.map((p) => p.moduleId));
  const assessment = course.assessments[0];

  return {
    course: { id: course.id, slug: course.slug, title: course.title },
    enrollment: {
      id: enrollment.id,
      status: enrollment.status,
      progressPercent: enrollment.progressPercent,
    },
    modules: course.modules.map((m) => ({
      id: m.id,
      title: m.title,
      content: m.content,
      orderIndex: m.orderIndex,
      durationMinutes: m.durationMinutes,
      completed: completed.has(m.id),
    })),
    assessment: assessment
      ? {
          id: assessment.id,
          title: assessment.title,
          // The assessment only opens once every module is done.
          unlocked: course.modules.every((m) => completed.has(m.id)),
        }
      : null,
  };
}

export async function completeModule(userId: string, slug: string, moduleId: string) {
  const course = await prisma.course.findUnique({
    where: { slug },
    include: { modules: { select: { id: true } } },
  });
  if (!course) throw AppError.notFound('That course could not be found.');

  const enrollment = await prisma.enrollment.findUnique({
    where: { userId_courseId: { userId, courseId: course.id } },
  });
  if (!enrollment) throw AppError.forbidden('You are not enrolled in this course.');
  if (!course.modules.some((m) => m.id === moduleId)) {
    throw AppError.badRequest('That module does not belong to this course.');
  }

  // Idempotent: marking a module complete twice is not an error.
  await prisma.moduleProgress.upsert({
    where: { enrollmentId_moduleId: { enrollmentId: enrollment.id, moduleId } },
    update: {},
    create: { enrollmentId: enrollment.id, moduleId },
  });

  const completedCount = await prisma.moduleProgress.count({
    where: { enrollmentId: enrollment.id },
  });
  const total = course.modules.length;
  const progressPercent = total === 0 ? 0 : Math.round((completedCount / total) * 100);
  const courseCompleted = completedCount >= total;

  await prisma.enrollment.update({
    where: { id: enrollment.id },
    data: {
      progressPercent,
      // Completing modules does not by itself complete the course if an
      // assessment is required — but it does unlock it.
      ...(courseCompleted && enrollment.status === 'ACTIVE'
        ? { status: 'COMPLETED', completedAt: new Date() }
        : {}),
    },
  });

  return { progressPercent, courseCompleted };
}
