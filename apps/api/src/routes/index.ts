import { Router } from 'express';
import { authRouter } from '../modules/auth/auth.routes.js';
import { healthRouter } from '../modules/health/health.routes.js';
import { apiKeysRouter, hrVerificationRouter, myCertificatesRouter, verificationRouter, } from '../modules/certificates/verification.routes.js';
import { catalogueRouter, studentRouter } from '../modules/learning/learning.routes.js';
import { providerRouter } from '../modules/provider/provider.routes.js';
import { adminRouter } from '../modules/admin/admin.routes.js';
export const apiRouter = Router();
apiRouter.use('/health', healthRouter);
apiRouter.use('/auth', authRouter);
// Public certificate verification, opened from a QR code with no account.
apiRouter.use('/verify', verificationRouter);
// Same check, attributed to the signed-in employer for their history.
apiRouter.use('/hr/verify', hrVerificationRouter);
// Employer API keys for machine-to-machine verification.
apiRouter.use('/hr/api-keys', apiKeysRouter);
// A learner's own certificates.
apiRouter.use('/student/certificates', myCertificatesRouter);
// Course catalogue, browsable without an account.
apiRouter.use('/courses', catalogueRouter);
// Learner portal.
apiRouter.use('/student', studentRouter);
// Training provider portal.
apiRouter.use('/provider', providerRouter);
// Platform administration.
apiRouter.use('/admin', adminRouter);
