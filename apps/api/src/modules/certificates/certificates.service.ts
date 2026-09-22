import { prisma } from '../../lib/prisma.js';
import { AppError } from '../../lib/errors.js';
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

export async function listForHolder(holderId: string) {
  const records = await prisma.certificate.findMany({
    where: { holderId },
    orderBy: { issuedAt: 'desc' },
  });
  const now = new Date();
  return records.map((record) => ({
    id: record.id,
    certificateId: record.certificateId,
    trackName: record.trackName,
    issuerName: record.issuerName,
    skills: parseSkills(record.skillsJson),
    score: record.score,
    status: record.status,
    isExpired: Boolean(record.expiresAt && record.expiresAt <= now),
    issuedAt: record.issuedAt.toISOString(),
    expiresAt: record.expiresAt?.toISOString() ?? null,
  }));
}

/**
 * Looks a certificate up by its public identifier, scoped to its holder.
 *
 * Scoping matters: without it, any signed-in learner could read any other
 * learner's certificate by guessing an ID. Anyone who legitimately needs to
 * see someone else's credential uses the public verify endpoint, which
 * deliberately exposes less.
 */
export async function getForHolder(holderId: string, certificateId: string, webAppUrl: string) {
  const record = await prisma.certificate.findFirst({
    where: { certificateId: certificateId.toUpperCase(), holderId },
    include: { track: { select: { nsqfLevel: true, description: true } } },
  });
  if (!record) throw AppError.notFound('That certificate could not be found.');

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

  return {
    id: record.id,
    certificateId: record.certificateId,
    holderName: record.holderName,
    trackName: record.trackName,
    trackDescription: record.track.description,
    issuerName: record.issuerName,
    nsqfLevel: record.track.nsqfLevel,
    skills,
    score: record.score,
    status: record.status,
    isExpired: Boolean(record.expiresAt && record.expiresAt <= new Date()),
    issuedAt: record.issuedAt.toISOString(),
    expiresAt: record.expiresAt?.toISOString() ?? null,
    revokedAt: record.revokedAt?.toISOString() ?? null,
    revokedReason: record.revokedReason,
    onestStatus: record.onestStatus,
    onestPublishedAt: record.onestPublishedAt?.toISOString() ?? null,
    signatureValid,
    verificationUrl: webAppUrl.replace(/\/$/, '') + '/verify/' + record.certificateId,
  };
}
