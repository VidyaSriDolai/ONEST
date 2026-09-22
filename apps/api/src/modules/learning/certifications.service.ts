import { prisma } from '../../lib/prisma.js';

interface TrackProgressResult {
  id: string;
  slug: string;
  name: string;
  description: string;
  nsqfLevel: number | null;
  minimumScore: number;
  issuerName: string;
  skills: string[];
  requirements: Array<{
    courseId: string;
    courseTitle: string;
    courseSlug: string;
    enrolled: boolean;
    courseCompleted: boolean;
    assessmentPassed: boolean;
    bestScore: number | null;
  }>;
  coursesCompleted: number;
  coursesTotal: number;
  percentComplete: number;
  eligible: boolean;
  certificateId: string | null;
}

/**
 * Computes where a learner stands against every certification track.
 *
 * Eligibility is derived, never stored: a track's requirements can change, and
 * a cached "eligible" flag would quietly go stale. This does mean the
 * computation runs per request, which is fine at this scale — the queries are
 * three indexed reads regardless of how many tracks exist.
 */
export async function getTrackProgress(userId: string): Promise<TrackProgressResult[]> {
  const tracks = await prisma.certificationTrack.findMany({
    where: { isActive: true },
    include: {
      issuerOrg: { select: { name: true } },
      skills: { include: { skill: { select: { name: true } } } },
      courses: { include: { course: { select: { id: true, title: true, slug: true } } } },
    },
    orderBy: { name: 'asc' },
  });

  const [enrollments, attempts, certificates] = await Promise.all([
    prisma.enrollment.findMany({ where: { userId } }),
    prisma.assessmentAttempt.findMany({
      where: { userId, submittedAt: { not: null } },
      include: { assessment: { select: { courseId: true, passingScore: true } } },
    }),
    prisma.certificate.findMany({
      where: { holderId: userId, status: 'ISSUED' },
      select: { certificateId: true, trackId: true },
    }),
  ]);

  const enrollmentByCourse = new Map(enrollments.map((e) => [e.courseId, e]));
  const certificateByTrack = new Map(certificates.map((c) => [c.trackId, c.certificateId]));

  // Best score per course, and whether any attempt cleared that course's bar.
  const bestByCourse = new Map<string, { best: number; passed: boolean }>();
  for (const attempt of attempts) {
    const courseId = attempt.assessment.courseId;
    const score = attempt.score ?? 0;
    const current = bestByCourse.get(courseId);
    bestByCourse.set(courseId, {
      best: Math.max(current?.best ?? 0, score),
      passed: (current?.passed ?? false) || Boolean(attempt.passed),
    });
  }

  return tracks.map((track) => {
    const requirements = track.courses.map(({ course }) => {
      const enrollment = enrollmentByCourse.get(course.id);
      const best = bestByCourse.get(course.id);
      return {
        courseId: course.id,
        courseTitle: course.title,
        courseSlug: course.slug,
        enrolled: Boolean(enrollment),
        courseCompleted: enrollment?.status === 'COMPLETED',
        assessmentPassed: Boolean(best?.passed) && (best?.best ?? 0) >= track.minimumScore,
        bestScore: best?.best ?? null,
      };
    });
    const coursesTotal = requirements.length;
    const coursesCompleted = requirements.filter((r) => r.courseCompleted && r.assessmentPassed).length;

    return {
      id: track.id,
      slug: track.slug,
      name: track.name,
      description: track.description,
      nsqfLevel: track.nsqfLevel,
      minimumScore: track.minimumScore,
      issuerName: track.issuerOrg.name,
      skills: track.skills.map((s) => s.skill.name),
      requirements,
      coursesCompleted,
      coursesTotal,
      percentComplete: coursesTotal === 0 ? 0 : Math.round((coursesCompleted / coursesTotal) * 100),
      eligible: coursesTotal > 0 && coursesCompleted === coursesTotal,
      certificateId: certificateByTrack.get(track.id) ?? null,
    };
  });
}

export async function getStudentDashboard(userId: string) {
  const [enrollments, certificates, notifications, tracks] = await Promise.all([
    prisma.enrollment.findMany({
      where: { userId },
      include: {
        course: {
          select: {
            slug: true,
            title: true,
            modules: { select: { id: true, title: true }, orderBy: { orderIndex: 'asc' } },
          },
        },
        moduleProgress: { select: { moduleId: true } },
      },
      orderBy: { enrolledAt: 'desc' },
    }),
    prisma.certificate.findMany({
      where: { holderId: userId, status: 'ISSUED' },
      select: { skillsJson: true },
    }),
    prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 5,
    }),
    getTrackProgress(userId),
  ]);

  // Skills are counted distinctly across every certificate earned.
  const skillSet = new Set<string>();
  for (const certificate of certificates) {
    try {
      const parsed: unknown = JSON.parse(certificate.skillsJson);
      if (Array.isArray(parsed)) {
        for (const skill of parsed)
          if (typeof skill === 'string') skillSet.add(skill);
      }
    } catch {
      // A malformed snapshot should not break the dashboard.
    }
  }

  const continueLearning = enrollments
    .filter((e) => e.status === 'ACTIVE')
    .slice(0, 3)
    .map((enrollment) => {
      const done = new Set(enrollment.moduleProgress.map((p) => p.moduleId));
      const next = enrollment.course.modules.find((m) => !done.has(m.id));
      return {
        courseSlug: enrollment.course.slug,
        courseTitle: enrollment.course.title,
        progressPercent: enrollment.progressPercent,
        nextModuleTitle: next?.title ?? null,
      };
    });

  // The track closest to completion without being finished — the one worth
  // nudging the learner towards.
  const nearest = tracks
    .filter((t) => !t.eligible && t.coursesTotal > 0)
    .sort((a, b) => b.percentComplete - a.percentComplete)[0];

  return {
    stats: {
      enrolled: enrollments.length,
      completed: enrollments.filter((e) => e.status === 'COMPLETED').length,
      certificates: certificates.length,
      skills: skillSet.size,
    },
    skillsEarned: [...skillSet].sort(),
    continueLearning,
    recentNotifications: notifications.map((n) => ({
      id: n.id,
      type: n.type,
      title: n.title,
      body: n.body,
      link: n.link,
      read: n.readAt !== null,
      createdAt: n.createdAt.toISOString(),
    })),
    nearestTrack: nearest
      ? {
          name: nearest.name,
          percentComplete: nearest.percentComplete,
          coursesRemaining: nearest.coursesTotal - nearest.coursesCompleted,
        }
      : null,
  };
}
