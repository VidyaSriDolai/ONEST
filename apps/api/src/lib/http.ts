import type { NextFunction, Request, RequestHandler, Response } from 'express';

export function sendSuccess(res: Response, data: unknown, status = 200) {
  const body = { ok: true, data };
  return res.status(status).json(body);
}

/** Best-effort client IP, honouring a proxy hop when `trust proxy` is on. */
export function clientIp(req: Request): string | undefined {
  return req.ip ?? req.socket.remoteAddress ?? undefined;
}

export function userAgent(req: Request): string | undefined {
  return req.get('user-agent')?.slice(0, 255);
}

/** Wraps an async handler so rejected promises reach the error middleware. */
export function asyncHandler(fn: (req: Request, res: Response, next: NextFunction) => Promise<unknown>): RequestHandler {
  return (req, res, next) => {
    fn(req, res, next).catch(next);
  };
}
