import { sendSuccess } from '../../lib/http.js';
import * as courses from './courses.service.js';
import * as assessments from './assessments.service.js';
import * as certifications from './certifications.service.js';
import * as notifications from '../notifications/notifications.service.js';
import type { Request, Response } from 'express';
import type { AccessTokenPayload } from '../../types/express.js';

const str = (value: unknown): string | undefined => {
  const s = typeof value === 'string' ? value.trim() : '';
  return s.length > 0 ? s : undefined;
};

function user(req: Request): AccessTokenPayload {
  if (!req.user) throw new Error('learning controller reached without req.user');
  return req.user;
}

// --- Catalogue --------------------------------------------------------------

export async function listCourses(req: Request, res: Response) {
  sendSuccess(
    res,
    await courses.listCourses(req.user?.sub ?? null, {
      search: str(req.query.search),
      category: str(req.query.category),
      level: str(req.query.level),
    }),
  );
}

export async function listCategories(_req: Request, res: Response) {
  sendSuccess(res, await courses.listCategories());
}

export async function getCourse(req: Request, res: Response) {
  sendSuccess(res, await courses.getCourse(String(req.params.slug), req.user?.sub ?? null));
}

export async function enroll(req: Request, res: Response) {
  sendSuccess(res, await courses.enroll(user(req).sub, String(req.params.slug)), 201);
}

// --- Learning ---------------------------------------------------------------

export async function getLearningView(req: Request, res: Response) {
  sendSuccess(res, await courses.getLearningView(user(req).sub, String(req.params.slug)));
}

export async function completeModule(req: Request, res: Response) {
  sendSuccess(
    res,
    await courses.completeModule(user(req).sub, String(req.params.slug), String(req.body?.moduleId ?? '')),
  );
}

// --- Assessments ------------------------------------------------------------

export async function startAttempt(req: Request, res: Response) {
  sendSuccess(res, await assessments.startAttempt(user(req).sub, String(req.params.assessmentId)));
}

export async function saveAnswer(req: Request, res: Response) {
  await assessments.saveAnswer(
    user(req).sub,
    String(req.params.attemptId),
    String(req.body?.questionId ?? ''),
    req.body?.optionId ? String(req.body.optionId) : null,
  );
  sendSuccess(res, { saved: true });
}

export async function submitAttempt(req: Request, res: Response) {
  sendSuccess(
    res,
    await assessments.submitAttempt(
      user(req).sub,
      String(req.params.attemptId),
      Boolean(req.body?.autoSubmitted),
    ),
  );
}

export async function getResult(req: Request, res: Response) {
  sendSuccess(res, await assessments.getResult(user(req).sub, String(req.params.attemptId)));
}

export async function getLatestResult(req: Request, res: Response) {
  sendSuccess(res, await assessments.getLatestResult(user(req).sub));
}

// --- Certifications and dashboard -------------------------------------------

export async function trackProgress(req: Request, res: Response) {
  sendSuccess(res, await certifications.getTrackProgress(user(req).sub));
}

export async function dashboard(req: Request, res: Response) {
  sendSuccess(res, await certifications.getStudentDashboard(user(req).sub));
}

// --- Notifications ----------------------------------------------------------

export async function listNotifications(req: Request, res: Response) {
  sendSuccess(res, await notifications.listNotifications(user(req).sub));
}

export async function unreadCount(req: Request, res: Response) {
  sendSuccess(res, { count: await notifications.unreadCount(user(req).sub) });
}

export async function markRead(req: Request, res: Response) {
  await notifications.markRead(user(req).sub, String(req.params.id));
  sendSuccess(res, { read: true });
}

export async function markAllRead(req: Request, res: Response) {
  sendSuccess(res, { marked: await notifications.markAllRead(user(req).sub) });
}
