import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { ROLES } from '@skillseal/shared';
import { requireAuth, requireRole } from '../../middleware/auth.js';
import { asyncHandler } from '../../lib/http.js';
import { isProduction } from '../../config/env.js';
import { optionalApiKey } from '../../middleware/api-key.js';
import * as controller from './verification.controller.js';
import * as certController from './certificates.controller.js';
/**
 * The KPI is 1,000 verifications/hour. This ceiling sits far above that per
 * IP, so legitimate bulk checking is unaffected while scripted enumeration of
 * the public endpoint is not.
 */
const verifyLimiter = rateLimit({
    windowMs: 60_000,
    limit: 60,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    skip: () => !isProduction && process.env.RATE_LIMIT_IN_DEV !== 'true',
    handler: (_req, res) => {
        res.status(429).json({
            ok: false,
            error: {
                code: 'RATE_LIMITED',
                message: 'Too many verification requests. Please wait a moment and try again.',
            },
        });
    },
});
export const verificationRouter = Router();
// Public: no authentication, opened straight from a QR code.
verificationRouter.get('/:certificateId', verifyLimiter, asyncHandler(optionalApiKey), asyncHandler(controller.verifyPublic));
export const hrVerificationRouter = Router();
hrVerificationRouter.use(requireAuth, requireRole(ROLES.HR, ROLES.ADMIN));
hrVerificationRouter.post('/', verifyLimiter, asyncHandler(controller.verifyAsUser));
hrVerificationRouter.get('/history', asyncHandler(controller.history));
// --- Employer API keys (spec screen 20) ------------------------------------
export const apiKeysRouter = Router();
apiKeysRouter.use(requireAuth, requireRole(ROLES.HR, ROLES.ADMIN));
apiKeysRouter.get('/', asyncHandler(certController.listKeys));
apiKeysRouter.post('/', asyncHandler(certController.createKey));
apiKeysRouter.delete('/:keyId', asyncHandler(certController.revokeKey));
// --- A learner's own certificates (spec screen 12) -------------------------
export const myCertificatesRouter = Router();
myCertificatesRouter.use(requireAuth, requireRole(ROLES.STUDENT, ROLES.ADMIN));
myCertificatesRouter.get('/', asyncHandler(certController.listMine));
myCertificatesRouter.get('/:certificateId', asyncHandler(certController.getMine));
