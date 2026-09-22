import { AppError } from '../../lib/errors.js';
import { clientIp, sendSuccess, userAgent } from '../../lib/http.js';
import { isProduction } from '../../config/env.js';
import * as authService from './auth.service.js';
import type { RequestContext } from './auth.service.js';
import type { NextFunction, Request, Response } from 'express';

/**
 * The refresh token lives in an httpOnly cookie so JavaScript on the page can
 * never read it. The short-lived access token is returned in the body and kept
 * in memory by the client.
 */
export const REFRESH_COOKIE = 'ss_refresh';
const REFRESH_COOKIE_PATH = '/api/auth';

function setRefreshCookie(res: Response, token: string, maxAgeDays: number): void {
  res.cookie(REFRESH_COOKIE, token, {
    httpOnly: true,
    secure: isProduction,
    sameSite: 'lax',
    path: REFRESH_COOKIE_PATH,
    maxAge: maxAgeDays * 24 * 60 * 60 * 1000,
  });
}

function clearRefreshCookie(res: Response): void {
  res.clearCookie(REFRESH_COOKIE, { path: REFRESH_COOKIE_PATH });
}

function contextFrom(req: Request): RequestContext {
  return { ipAddress: clientIp(req), userAgent: userAgent(req) };
}

export async function register(req: Request, res: Response): Promise<void> {
  const { session, refreshToken } = await authService.register(req.body, contextFrom(req));
  setRefreshCookie(res, refreshToken, 30);
  sendSuccess(res, session, 201);
}

export async function login(req: Request, res: Response): Promise<void> {
  const body = req.body as { rememberMe?: boolean; email: string; password: string };
  const { session, refreshToken } = await authService.login(body, contextFrom(req));
  // "Remember me" controls how long the browser keeps the refresh cookie.
  setRefreshCookie(res, refreshToken, body.rememberMe ? 30 : 1);
  sendSuccess(res, session);
}

export async function refresh(req: Request, res: Response, next: NextFunction): Promise<void> {
  const token = req.cookies?.[REFRESH_COOKIE];
  if (!token) throw AppError.sessionExpired();
  try {
    const { session, refreshToken } = await authService.refresh(token, contextFrom(req));
    setRefreshCookie(res, refreshToken, 30);
    sendSuccess(res, session);
  } catch (error) {
    // A dead token should not linger in the browser.
    clearRefreshCookie(res);
    next(error);
  }
}

export async function logout(req: Request, res: Response): Promise<void> {
  await authService.logout(req.cookies?.[REFRESH_COOKIE], contextFrom(req));
  clearRefreshCookie(res);
  sendSuccess(res, { loggedOut: true });
}

export async function me(req: Request, res: Response): Promise<void> {
  if (!req.user) throw AppError.unauthenticated();
  sendSuccess(res, await authService.getCurrentUser(req.user.sub));
}

export async function forgotPassword(req: Request, res: Response): Promise<void> {
  await authService.requestPasswordReset(req.body, contextFrom(req));
  // Deliberately identical whether or not the account exists.
  sendSuccess(res, {
    message: 'If an account exists for that email, a reset link is on its way.',
  });
}

export async function resetPassword(req: Request, res: Response): Promise<void> {
  await authService.resetPassword(req.body, contextFrom(req));
  clearRefreshCookie(res);
  sendSuccess(res, { message: 'Your password has been updated. You can sign in now.' });
}
