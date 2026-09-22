import { z } from 'zod';
import { AppError } from '../../lib/errors.js';
import { sendSuccess } from '../../lib/http.js';
import { env } from '../../config/env.js';
import { prisma } from '../../lib/prisma.js';
import * as certificates from './certificates.service.js';
import * as apiKeys from './api-keys.service.js';
import type { Request, Response } from 'express';
import type { AccessTokenPayload } from '../../types/express.js';

function user(req: Request): AccessTokenPayload {
  if (!req.user) throw AppError.unauthenticated();
  return req.user;
}

// --- Student certificates ---------------------------------------------------

export async function listMine(req: Request, res: Response) {
  sendSuccess(res, await certificates.listForHolder(user(req).sub));
}

export async function getMine(req: Request, res: Response) {
  const certificateId = String(req.params.certificateId ?? '');
  sendSuccess(res, await certificates.getForHolder(user(req).sub, certificateId, env.WEB_APP_URL));
}

// --- API keys ---------------------------------------------------------------

const createKeySchema = z.object({
  name: z.string().trim().min(1, 'Give the key a name').max(60, 'Name is too long'),
});

/**
 * API keys belong to an organization, so an account without one cannot hold
 * them. Employer accounts always have an organization; this guards the case
 * where an admin without one reaches the endpoint.
 */
async function requireOrganization(req: Request): Promise<string> {
  const found = await prisma.user.findUnique({
    where: { id: user(req).sub },
    select: { organizationId: true },
  });
  if (!found?.organizationId) {
    throw AppError.forbidden('API keys are issued to an organization, and this account has none.');
  }
  return found.organizationId;
}

export async function listKeys(req: Request, res: Response) {
  sendSuccess(res, await apiKeys.listApiKeys(await requireOrganization(req)));
}

export async function createKey(req: Request, res: Response) {
  const parsed = createKeySchema.safeParse(req.body);
  if (!parsed.success) {
    throw AppError.badRequest('Please correct the highlighted fields.', {
      name: parsed.error.issues.map((i) => i.message),
    });
  }
  const organizationId = await requireOrganization(req);
  sendSuccess(
    res,
    await apiKeys.createApiKey(organizationId, user(req).sub, parsed.data.name),
    201,
  );
}

export async function revokeKey(req: Request, res: Response) {
  const organizationId = await requireOrganization(req);
  await apiKeys.revokeApiKey(organizationId, String(req.params.keyId ?? ''));
  sendSuccess(res, { revoked: true });
}
