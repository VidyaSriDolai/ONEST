import crypto from 'node:crypto';
import { prisma } from '../../lib/prisma.js';
import { AppError } from '../../lib/errors.js';
import { hashToken } from '../../lib/tokens.js';
import { isProduction } from '../../config/env.js';
import type { ResolvedApiKey } from '../../types/express.js';

/**
 * API keys follow the same rule as refresh tokens: only a SHA-256 hash is
 * stored, so a database leak yields nothing usable. The plaintext is returned
 * exactly once, at creation.
 */
const KEY_PREFIX = isProduction ? 'ss_live_' : 'ss_test_';
const MAX_KEYS_PER_ORG = 5;

function toSummary(record: {
  id: string;
  name: string;
  keyPrefix: string;
  usageCount: number;
  lastUsedAt: Date | null;
  createdAt: Date;
  revokedAt: Date | null;
}) {
  return {
    id: record.id,
    name: record.name,
    keyPrefix: record.keyPrefix,
    usageCount: record.usageCount,
    lastUsedAt: record.lastUsedAt?.toISOString() ?? null,
    createdAt: record.createdAt.toISOString(),
    revokedAt: record.revokedAt?.toISOString() ?? null,
  };
}

export async function listApiKeys(organizationId: string) {
  const keys = await prisma.apiKey.findMany({
    where: { organizationId },
    orderBy: { createdAt: 'desc' },
  });
  return keys.map(toSummary);
}

export async function createApiKey(organizationId: string, userId: string, name: string) {
  const active = await prisma.apiKey.count({ where: { organizationId, revokedAt: null } });
  if (active >= MAX_KEYS_PER_ORG) {
    throw AppError.badRequest(
      `You can have at most ${MAX_KEYS_PER_ORG} active API keys. Revoke one before creating another.`,
    );
  }

  // 32 random bytes: far beyond guessing, and short enough to paste.
  const secret = crypto.randomBytes(32).toString('base64url');
  const plaintextKey = KEY_PREFIX + secret;

  const record = await prisma.apiKey.create({
    data: {
      name: name.trim() || 'Untitled key',
      keyHash: hashToken(plaintextKey),
      keyPrefix: plaintextKey.slice(0, KEY_PREFIX.length + 4),
      organizationId,
      createdById: userId,
    },
  });

  return { ...toSummary(record), plaintextKey };
}

export async function revokeApiKey(organizationId: string, keyId: string): Promise<void> {
  // Scoped by organization so one employer cannot revoke another's key.
  const result = await prisma.apiKey.updateMany({
    where: { id: keyId, organizationId, revokedAt: null },
    data: { revokedAt: new Date() },
  });
  if (result.count === 0) {
    throw AppError.notFound('That API key does not exist, or has already been revoked.');
  }
}

/**
 * Resolves a presented key. Returns null rather than throwing so the caller
 * decides how to respond — the verification endpoint treats an unknown key the
 * same as no key at all.
 */
export async function authenticateApiKey(presented: string): Promise<ResolvedApiKey | null> {
  const record = await prisma.apiKey.findUnique({
    where: { keyHash: hashToken(presented) },
    select: { id: true, organizationId: true, keyPrefix: true, revokedAt: true, expiresAt: true },
  });
  if (!record || record.revokedAt) return null;
  if (record.expiresAt && record.expiresAt <= new Date()) return null;

  // Fire-and-forget: usage tracking must not slow down or fail a verification.
  void prisma.apiKey
    .update({
      where: { id: record.id },
      data: { usageCount: { increment: 1 }, lastUsedAt: new Date() },
    })
    .catch(() => undefined);

  return { id: record.id, organizationId: record.organizationId, prefix: record.keyPrefix };
}
