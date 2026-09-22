import { looksLikeCertificateId } from '../../lib/certificate-signing.js';
import { clientIp, sendSuccess, userAgent } from '../../lib/http.js';
import { prisma } from '../../lib/prisma.js';
import * as service from './verification.service.js';
import type { Request, Response } from 'express';
import type { AccessTokenPayload } from '../../types/express.js';

function user(req: Request): AccessTokenPayload {
  if (!req.user) throw new Error('verification controller reached without req.user');
  return req.user;
}

/**
 * Public verification. Intentionally unauthenticated: the whole point is that
 * an employer can check a credential without an account.
 *
 * A malformed ID short-circuits to NOT_FOUND without touching the database,
 * so scripted junk cannot be used to generate load.
 */
export async function verifyPublic(req: Request, res: Response) {
  const certificateId = String(req.params.certificateId ?? '');
  if (!looksLikeCertificateId(certificateId)) {
    sendSuccess(res, {
      result: 'NOT_FOUND',
      certificate: null,
      verifiedAt: new Date().toISOString(),
    });
    return;
  }

  const result = await service.verifyCertificate(certificateId, {
    // A valid API key means this came from an employer's own system rather
    // than someone scanning a QR code.
    channel: req.apiKey ? 'API' : 'PUBLIC_PAGE',
    ipAddress: clientIp(req),
    userAgent: userAgent(req),
    apiKeyId: req.apiKey?.id,
  });

  // Never cached: a certificate can be revoked at any moment, and a stale
  // "VALID" is the one answer this endpoint must never give.
  res.setHeader('Cache-Control', 'no-store');
  sendSuccess(res, result);
}

/** Same check, but attributed to the signed-in HR user for their history. */
export async function verifyAsUser(req: Request, res: Response) {
  const certificateId = String(req.body?.certificateId ?? '');
  if (!looksLikeCertificateId(certificateId)) {
    sendSuccess(res, {
      result: 'NOT_FOUND',
      certificate: null,
      verifiedAt: new Date().toISOString(),
    });
    return;
  }

  const result = await service.verifyCertificate(certificateId, {
    channel: 'HR_PORTAL',
    ipAddress: clientIp(req),
    userAgent: userAgent(req),
    verifiedById: user(req).sub,
  });

  res.setHeader('Cache-Control', 'no-store');
  sendSuccess(res, result);
}

export async function history(req: Request, res: Response) {
  const limit = Number(req.query.limit ?? 25);
  // The organisation scopes which API-key checks this user may see.
  const found = await prisma.user.findUnique({
    where: { id: user(req).sub },
    select: { organizationId: true },
  });
  sendSuccess(
    res,
    await service.getVerificationHistory(
      user(req).sub,
      found?.organizationId ?? null,
      Number.isFinite(limit) ? limit : 25,
    ),
  );
}
