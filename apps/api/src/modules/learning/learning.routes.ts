import { Router } from 'express';
import { ROLES } from '@skillseal/shared';
import { optionalAuth, requireAuth, requireRole } from '../../middleware/auth.js';
import { asyncHandler } from '../../lib/http.js';
import * as controller from './learning.controller.js';
/**
 * The catalogue is browsable without an account — a prospective learner should
 * be able to see what is on offer before signing up. Everything that touches a
 * learner's own record requires authentication.
 */
export const catalogueRouter = Router();
// Reads the token when present so a signed-in learner sees their own progress
// on each card, without making the catalogue itself require an account.
catalogueRouter.use(optionalAuth);
catalogueRouter.get('/', asyncHandler(controller.listCourses));
catalogueRouter.get('/categories', asyncHandler(controller.listCategories));
catalogueRouter.get('/:slug', asyncHandler(controller.getCourse));
export const studentRouter = Router();
studentRouter.use(requireAuth, requireRole(ROLES.STUDENT, ROLES.ADMIN));
studentRouter.get('/dashboard', asyncHandler(controller.dashboard));
studentRouter.get('/certifications', asyncHandler(controller.trackProgress));
studentRouter.post('/courses/:slug/enroll', asyncHandler(controller.enroll));
studentRouter.get('/learn/:slug', asyncHandler(controller.getLearningView));
studentRouter.post('/learn/:slug/complete', asyncHandler(controller.completeModule));
studentRouter.post('/assessments/:assessmentId/start', asyncHandler(controller.startAttempt));
studentRouter.post('/attempts/:attemptId/answer', asyncHandler(controller.saveAnswer));
studentRouter.post('/attempts/:attemptId/submit', asyncHandler(controller.submitAttempt));
// The static path must be registered before :attemptId, which would
// otherwise match the literal word "latest" and fail the lookup.
studentRouter.get('/attempts/latest/result', asyncHandler(controller.getLatestResult));
studentRouter.get('/attempts/:attemptId/result', asyncHandler(controller.getResult));
studentRouter.get('/notifications', asyncHandler(controller.listNotifications));
studentRouter.get('/notifications/unread-count', asyncHandler(controller.unreadCount));
studentRouter.post('/notifications/:id/read', asyncHandler(controller.markRead));
studentRouter.post('/notifications/read-all', asyncHandler(controller.markAllRead));
