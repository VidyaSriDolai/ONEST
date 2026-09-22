/**
 * Errors the API raises on purpose. Anything else that reaches the error
 * handler is treated as a bug and reported as INTERNAL_ERROR without leaking
 * its message to the client.
 */
export class AppError extends Error {
  status: number;
  code: string;
  details?: Record<string, string[]>;

  constructor(status: number, code: string, message: string, details?: Record<string, string[]>) {
    super(message);
    this.name = 'AppError';
    this.status = status;
    this.code = code;
    this.details = details;
    Error.captureStackTrace?.(this, AppError);
  }

  static badRequest(message: string, details?: Record<string, string[]>) {
    return new AppError(400, 'VALIDATION_ERROR', message, details);
  }

  static invalidCredentials(message = 'That email and password combination is not correct.') {
    return new AppError(401, 'INVALID_CREDENTIALS', message);
  }

  static unauthenticated(message = 'You need to sign in to continue.') {
    return new AppError(401, 'UNAUTHENTICATED', message);
  }

  static sessionExpired(message = 'Your session has expired. Please sign in again.') {
    return new AppError(401, 'SESSION_EXPIRED', message);
  }

  static forbidden(message = 'You do not have access to this resource.') {
    return new AppError(403, 'FORBIDDEN', message);
  }

  static notFound(message = 'That resource could not be found.') {
    return new AppError(404, 'NOT_FOUND', message);
  }

  static conflict(code: string, message: string, details?: Record<string, string[]>) {
    return new AppError(409, code, message, details);
  }

  static rateLimited(message = 'Too many attempts. Please try again shortly.') {
    return new AppError(429, 'RATE_LIMITED', message);
  }
}
