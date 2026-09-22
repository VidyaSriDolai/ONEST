import { ZodError } from 'zod';
import { AppError } from '../lib/errors.js';
import { zodToDetails } from './validate.js';
import { logger } from '../lib/logger.js';
import { isProduction } from '../config/env.js';
import type { NextFunction, Request, Response } from 'express';

export function notFoundHandler(req: Request, res: Response) {
  const body = {
    ok: false,
    error: { code: 'NOT_FOUND', message: `No route matches ${req.method} ${req.originalUrl}` },
  };
  res.status(404).json(body);
}

export function errorHandler(
  error: unknown,
  _req: Request,
  res: Response,
  next: NextFunction,
): void {
  if (res.headersSent) {
    next(error);
    return;
  }

  if (error instanceof AppError) {
    const body = {
      ok: false,
      error: { code: error.code, message: error.message, details: error.details },
    };
    res.status(error.status).json(body);
    return;
  }

  if (error instanceof ZodError) {
    const body = {
      ok: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Please correct the highlighted fields.',
        details: zodToDetails(error),
      },
    };
    res.status(400).json(body);
    return;
  }

  // Anything reaching here is unexpected: log it in full, tell the client nothing.
  logger.error({ err: error }, 'Unhandled error');
  const body = {
    ok: false,
    error: {
      code: 'INTERNAL_ERROR',
      message: isProduction
        ? 'Something went wrong on our side. Please try again.'
        : error instanceof Error
          ? error.message
          : 'Unknown error',
    },
  };
  res.status(500).json(body);
}
