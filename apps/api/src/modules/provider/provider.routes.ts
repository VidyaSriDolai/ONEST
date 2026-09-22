import { Router } from 'express';
import { ROLES } from '@skillseal/shared';
import { requireAuth, requireRole } from '../../middleware/auth.js';
import { asyncHandler, sendSuccess } from '../../lib/http.js';
import { AppError } from '../../lib/errors.js';
import { prisma } from '../../lib/prisma.js';
import * as service from './provider.service.js';
import type { Request, Response } from 'express';
import type { AccessTokenPayload } from '../../types/express.js';

/** Every provider route is scoped to the calling account's organisation. */
async function orgOf(req: Request): Promise<string> {
  if (!req.user) throw AppError.unauthenticated();
  const user = await prisma.user.findUnique({
    where: { id: req.user.sub },
    select: { organizationId: true },
  });
  if (!user?.organizationId) {
    throw AppError.forbidden('This account is not linked to a training organisation.');
  }
  return user.organizationId;
}

function user(req: Request): AccessTokenPayload {
  if (!req.user) throw AppError.unauthenticated();
  return req.user;
}

export const providerRouter = Router();
providerRouter.use(requireAuth, requireRole(ROLES.COMPANY, ROLES.ADMIN));

providerRouter.get(
  '/dashboard',
  asyncHandler(async (req: Request, res: Response) => {
    sendSuccess(res, await service.getDashboard(await orgOf(req)));
  }),
);

providerRouter.get(
  '/courses',
  asyncHandler(async (req: Request, res: Response) => {
    sendSuccess(res, await service.listCourses(await orgOf(req)));
  }),
);

providerRouter.post(
  '/courses',
  asyncHandler(async (req: Request, res: Response) => {
    const body = req.body as Record<string, unknown>;
    sendSuccess(
      res,
      await service.createCourse(await orgOf(req), {
        title: String(body.title ?? '').trim(),
        description: String(body.description ?? '').trim(),
        category: String(body.category ?? 'General').trim(),
        level: String(body.level ?? 'BEGINNER'),
        durationHours: Number(body.durationHours ?? 0),
        modules: Array.isArray(body.modules)
          ? (body.modules as Array<Record<string, unknown>>).map((m) => ({
              title: String(m.title ?? '').trim(),
              content: String(m.content ?? '').trim(),
              durationMinutes: Number(m.durationMinutes ?? 15),
            }))
          : [],
        prerequisiteIds: Array.isArray(body.prerequisiteIds)
          ? (body.prerequisiteIds as unknown[]).map(String)
          : [],
        skillIds: Array.isArray(body.skillIds) ? (body.skillIds as unknown[]).map(String) : [],
        publish: Boolean(body.publish),
      }),
      201,
    );
  }),
);

providerRouter.patch(
  '/courses/:courseId/published',
  asyncHandler(async (req: Request, res: Response) => {
    await service.setCoursePublished(
      await orgOf(req),
      String(req.params.courseId),
      Boolean(req.body?.isPublished),
    );
    sendSuccess(res, { updated: true });
  }),
);

providerRouter.get(
  '/learners',
  asyncHandler(async (req: Request, res: Response) => {
    const courseSlug = typeof req.query.course === 'string' ? req.query.course : undefined;
    sendSuccess(res, await service.listLearners(await orgOf(req), courseSlug));
  }),
);

providerRouter.get(
  '/certificates',
  asyncHandler(async (req: Request, res: Response) => {
    sendSuccess(res, await service.listIssuedCertificates(await orgOf(req)));
  }),
);

providerRouter.post(
  '/certificates/:certificateId/revoke',
  asyncHandler(async (req: Request, res: Response) => {
    const reason = String(req.body?.reason ?? '').trim();
    if (reason.length < 5) {
      throw AppError.badRequest('Give a reason for revoking this certificate.', {
        reason: ['A reason of at least 5 characters is required.'],
      });
    }
    await service.revokeCertificate(
      await orgOf(req),
      user(req).sub,
      String(req.params.certificateId),
      reason,
    );
    sendSuccess(res, { revoked: true });
  }),
);

providerRouter.get(
  '/tracks',
  asyncHandler(async (req: Request, res: Response) => {
    sendSuccess(res, await service.listTracks(await orgOf(req)));
  }),
);

providerRouter.get(
  '/assessments/:courseId',
  asyncHandler(async (req: Request, res: Response) => {
    sendSuccess(res, await service.getAssessmentForCourse(await orgOf(req), String(req.params.courseId)));
  }),
);

providerRouter.post(
  '/assessments',
  asyncHandler(async (req: Request, res: Response) => {
    const body = req.body as Record<string, unknown>;
    sendSuccess(
      res,
      await service.saveAssessment(await orgOf(req), {
        courseId: String(body.courseId ?? ''),
        title: String(body.title ?? '').trim(),
        passingScore: Number(body.passingScore ?? 60),
        timeLimitMinutes: Number(body.timeLimitMinutes ?? 30),
        maxAttempts: Number(body.maxAttempts ?? 3),
        publish: Boolean(body.publish),
        questions: Array.isArray(body.questions)
          ? (body.questions as Array<Record<string, unknown>>).map((q) => ({
              text: String(q.text ?? '').trim(),
              marks: Number(q.marks ?? 1),
              options: Array.isArray(q.options)
                ? (q.options as Array<Record<string, unknown>>).map((o) => ({
                    text: String(o.text ?? '').trim(),
                    isCorrect: Boolean(o.isCorrect),
                  }))
                : [],
            }))
          : [],
      }),
      201,
    );
  }),
);

/** Skills are shared reference data, needed by the course form. */
providerRouter.get(
  '/skills',
  asyncHandler(async (_req: Request, res: Response) => {
    sendSuccess(
      res,
      await prisma.skill.findMany({ select: { id: true, name: true }, orderBy: { name: 'asc' } }),
    );
  }),
);
