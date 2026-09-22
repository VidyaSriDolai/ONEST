import { ZodError } from 'zod';
import type { ZodTypeAny } from 'zod';
import { AppError } from '../lib/errors.js';
import type { NextFunction, Request, Response } from 'express';

/** Turns a ZodError into the field-keyed shape the forms expect. */
export function zodToDetails(error: ZodError): Record<string, string[]> {
  const details: Record<string, string[]> = {};
  for (const issue of error.issues) {
    const key = issue.path.join('.') || '_';
    (details[key] ??= []).push(issue.message);
  }
  return details;
}

/**
 * Validates and replaces `req.body`, so handlers receive parsed, typed,
 * already-normalised input (emails lowercased, strings trimmed).
 */
export function validateBody(schema: ZodTypeAny) {
  return (req: Request, _res: Response, next: NextFunction) => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      next(AppError.badRequest('Please correct the highlighted fields.', zodToDetails(result.error)));
      return;
    }
    req.body = result.data;
    next();
  };
}
