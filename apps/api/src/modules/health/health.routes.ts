import { Router } from 'express';
import { prisma } from '../../lib/prisma.js';
import { sendSuccess, asyncHandler } from '../../lib/http.js';
export const healthRouter = Router();
/** Liveness: is the process up. */
healthRouter.get('/', (_req, res) => {
    sendSuccess(res, { status: 'ok', uptime: Math.round(process.uptime()) });
});
/** Readiness: can the process actually serve traffic (database reachable). */
healthRouter.get('/ready', asyncHandler(async (_req, res) => {
    const startedAt = Date.now();
    await prisma.$queryRaw `SELECT 1`;
    sendSuccess(res, { status: 'ready', databaseLatencyMs: Date.now() - startedAt });
}));
