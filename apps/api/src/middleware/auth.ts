import jwt from 'jsonwebtoken';
import { AppError } from '../lib/errors.js';
import { verifyAccessToken } from '../lib/tokens.js';
import type { NextFunction, Request, Response } from 'express';

/** Rejects the request unless a valid, unexpired access token is present. */
export function requireAuth(req: Request, _res: Response, next: NextFunction) {
  const header = req.get('authorization');
  if (!header?.startsWith('Bearer ')) {
    next(AppError.unauthenticated());
    return;
  }

  try {
    req.user = verifyAccessToken(header.slice(7));
    next();
  } catch (error) {
    // A distinct code lets the client refresh silently rather than logging out.
    next(
      error instanceof jwt.TokenExpiredError
        ? AppError.sessionExpired()
        : AppError.unauthenticated('Your session is not valid. Please sign in again.'),
    );
  }
}

/**
 * Populates `req.user` when a valid token is present, but never rejects.
 *
 * For endpoints that are genuinely public yet richer when signed in — the
 * course catalogue is browsable by anyone, but a signed-in learner should see
 * their own enrolment progress on each card.
 */
export function optionalAuth(req: Request, _res: Response, next: NextFunction) {
  const header = req.get('authorization');
  if (header?.startsWith('Bearer ')) {
    try {
      req.user = verifyAccessToken(header.slice(7));
    } catch {
      // An expired or bogus token is simply treated as signed out here.
    }
  }
  next();
}

/** Must be mounted after `requireAuth`. */
export function requireRole(...roles: string[]) {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user) {
      next(AppError.unauthenticated());
      return;
    }
    if (!roles.includes(req.user.role)) {
      next(AppError.forbidden());
      return;
    }
    next();
  };
}
