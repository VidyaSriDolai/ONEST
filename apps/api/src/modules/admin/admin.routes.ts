import { Router } from 'express';
import { ALL_ROLES, ROLES } from '@skillseal/shared';
import { requireAuth, requireRole } from '../../middleware/auth.js';
import { asyncHandler, sendSuccess } from '../../lib/http.js';
import { AppError } from '../../lib/errors.js';
import * as service from './admin.service.js';
import type { Request, Response } from 'express';
import type { AccessTokenPayload } from '../../types/express.js';

export const adminRouter = Router();
adminRouter.use(requireAuth, requireRole(ROLES.ADMIN));

function user(req: Request): AccessTokenPayload {
  if (!req.user) throw AppError.unauthenticated();
  return req.user;
}

adminRouter.get(
  '/dashboard',
  asyncHandler(async (_req: Request, res: Response) => {
    sendSuccess(res, await service.getDashboard());
  }),
);

adminRouter.get(
  '/users',
  asyncHandler(async (req: Request, res: Response) => {
    const search = typeof req.query.search === 'string' ? req.query.search : undefined;
    sendSuccess(res, await service.listUsers(search));
  }),
);

adminRouter.patch(
  '/users/:userId/active',
  asyncHandler(async (req: Request, res: Response) => {
    await service.setUserActive(user(req).sub, String(req.params.userId), Boolean(req.body?.isActive));
    sendSuccess(res, { updated: true });
  }),
);

adminRouter.patch(
  '/users/:userId/role',
  asyncHandler(async (req: Request, res: Response) => {
    const role = String(req.body?.role ?? '');
    if (!ALL_ROLES.includes(role as (typeof ALL_ROLES)[number])) {
      throw AppError.badRequest('That is not a valid role.');
    }
    await service.changeUserRole(user(req).sub, String(req.params.userId), role);
    sendSuccess(res, { updated: true });
  }),
);

adminRouter.get(
  '/organizations',
  asyncHandler(async (_req: Request, res: Response) => {
    sendSuccess(res, await service.listOrganizations());
  }),
);

adminRouter.get(
  '/audit',
  asyncHandler(async (req: Request, res: Response) => {
    const q = req.query;
    sendSuccess(
      res,
      await service.listAuditLogs({
        action: typeof q.action === 'string' && q.action ? q.action : undefined,
        from: typeof q.from === 'string' && q.from ? q.from : undefined,
        to: typeof q.to === 'string' && q.to ? q.to : undefined,
        search: typeof q.search === 'string' && q.search ? q.search : undefined,
      }),
    );
  }),
);

adminRouter.get(
  '/audit/actions',
  asyncHandler(async (_req: Request, res: Response) => {
    sendSuccess(res, await service.listAuditActions());
  }),
);

adminRouter.get(
  '/reports',
  asyncHandler(async (_req: Request, res: Response) => {
    sendSuccess(res, await service.getReports());
  }),
);

adminRouter.get(
  '/onest',
  asyncHandler(async (_req: Request, res: Response) => {
    sendSuccess(res, await service.listOnestSync());
  }),
);

adminRouter.post(
  '/onest/:certificateId/retry',
  asyncHandler(async (req: Request, res: Response) => {
    await service.retryOnestSync(user(req).sub, String(req.params.certificateId));
    sendSuccess(res, { retried: true });
  }),
);
