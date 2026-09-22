import type { Request } from 'express';

/**
 * Shape of the JWT access-token payload. Declared here so every module that
 * reads `req.user` shares one definition.
 */
export interface AccessTokenPayload {
  sub: string;
  role: string;
  email?: string;
  orgId?: string | null;
  iat?: number;
  exp?: number;
}

export interface ResolvedApiKey {
  id: string;
  organizationId: string;
  prefix: string;
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: AccessTokenPayload;
      apiKey?: ResolvedApiKey;
    }
  }
}
