import { prisma } from '../../lib/prisma.js';
import { logger } from '../../lib/logger.js';
import { verifyCertificateSignature } from '../../lib/certificate-signing.js';
import type { CertificatePayload } from '../../lib/certificate-signing.js';

function parseSkills(json: string): string[] {
  try {
    const parsed: unknown = JSON.parse(json);
    return Array.isArray(parsed) ? parsed.filter((s): s is string => typeof s === 'string') : [];
  } catch {
    return [];
  }
}

export interface VerificationContext {
  channel: string;
  ipAddress?: string;
  userAgent?: string;
  apiKeyId?: string;
  verifiedById?: string;
}

/**
 * Verifies a certificate and records the attempt.
 *
 * Order of checks is deliberate: integrity first, then revocation, then
 * expiry. A tampered record must never be reported as merely "expired", and
 * revocation outranks expiry because a revoked credential is a stronger
 * statement than one that simply aged out.
 */
export async function verifyCertificate(certificateId: string, ctx: VerificationContext) {
  const normalized = certificateId.trim().toUpperCase();

  const record = await prisma.certificate.findUnique({
    where: { certificateId: normalized },
    include: { track: { select: { nsqfLevel: true } } },
  });

  if (!record) {
    await recordVerification(normalized, 'NOT_FOUND', ctx);
    return { result: 'NOT_FOUND', certificate: null, verifiedAt: new Date().toISOString() };
  }

  const skills = parseSkills(record.skillsJson);

  const payload: CertificatePayload = {
    certificateId: record.certificateId,
    holderName: record.holderName,
    trackName: record.trackName,
    issuerName: record.issuerName,
    skills,
    issuedAt: record.issuedAt,
    expiresAt: record.expiresAt,
    score: record.score,
  };

  const signatureValid = verifyCertificateSignature(payload, record.signature, record.keyId);

  let result: 'VALID' | 'EXPIRED' | 'REVOKED' | 'TAMPERED';
  if (!signatureValid) {
    result = 'TAMPERED';
  } else if (record.status === 'REVOKED') {
    result = 'REVOKED';
  } else if (record.expiresAt && record.expiresAt <= new Date()) {
    result = 'EXPIRED';
  } else {
    result = 'VALID';
  }

  if (!signatureValid) {
    // Worth alerting on: a stored record no longer matching its signature
    // means the database was modified outside the application.
    logger.error(
      { certificateId: record.certificateId, keyId: record.keyId },
      'Certificate failed signature verification',
    );
  }

  const certificate = {
    certificateId: record.certificateId,
    holderName: record.holderName,
    trackName: record.trackName,
    issuerName: record.issuerName,
    skills,
    score: record.score,
    nsqfLevel: record.track.nsqfLevel,
    issuedAt: record.issuedAt.toISOString(),
    expiresAt: record.expiresAt?.toISOString() ?? null,
    revokedAt: record.revokedAt?.toISOString() ?? null,
    revokedReason: record.revokedReason,
    onestStatus: record.onestStatus,
    onestPublishedAt: record.onestPublishedAt?.toISOString() ?? null,
    signatureValid,
  };

  await recordVerification(record.certificateId, result, ctx);

  return { result, certificate, verifiedAt: new Date().toISOString() };
}

/**
 * Logging must never break a verification, so failures are swallowed. The
 * endpoint's job is to answer the employer; the audit trail is secondary.
 */
async function recordVerification(
  certificateId: string,
  result: string,
  ctx: VerificationContext,
): Promise<void> {
  try {
    await prisma.verificationLog.create({
      data: {
        certificateId,
        result,
        channel: ctx.channel,
        verifiedById: ctx.verifiedById ?? null,
        apiKeyId: ctx.apiKeyId ?? null,
        ipAddress: ctx.ipAddress ?? null,
        userAgent: ctx.userAgent ?? null,
      },
    });
  } catch (error) {
    logger.error({ err: error, certificateId }, 'Failed to write verification log');
  }
}

/**
 * Recent checks for the HR history screen.
 *
 * Covers both the checks this user ran in the portal and any run by their
 * organisation's API keys — otherwise machine-to-machine verifications would
 * be invisible to the very employer being billed for them, and the "Via"
 * column could never show anything but "Portal".
 */
export async function getVerificationHistory(userId: string, organizationId: string | null, limit = 25) {
  const orgKeyIds = organizationId
    ? (
        await prisma.apiKey.findMany({
          where: { organizationId },
          select: { id: true },
        })
      ).map((key) => key.id)
    : [];

  const logs = await prisma.verificationLog.findMany({
    where: {
      OR: [
        { verifiedById: userId },
        ...(orgKeyIds.length > 0 ? [{ apiKeyId: { in: orgKeyIds } }] : []),
      ],
    },
    orderBy: { createdAt: 'desc' },
    take: Math.min(limit, 100),
  });

  // Resolve holder names in one query rather than one per row.
  const ids = [...new Set(logs.map((log) => log.certificateId))];
  const certificates = await prisma.certificate.findMany({
    where: { certificateId: { in: ids } },
    select: { certificateId: true, holderName: true },
  });
  const nameById = new Map(certificates.map((c) => [c.certificateId, c.holderName]));

  return logs.map((log) => ({
    id: log.id,
    certificateId: log.certificateId,
    result: log.result,
    channel: log.channel,
    createdAt: log.createdAt.toISOString(),
    holderName: nameById.get(log.certificateId) ?? null,
  }));
}
