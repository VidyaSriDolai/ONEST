import crypto from 'node:crypto';
import { CERTIFICATE_ID_PATTERN } from '@skillseal/shared';
import { env } from '../config/env.js';
import { logger } from './logger.js';

/**
 * Shape of the certificate payload that is canonicalised and signed. Matches
 * the snapshotted columns on the certificates table.
 */
export interface CertificatePayload {
  certificateId: string;
  holderName: string;
  trackName: string;
  issuerName: string;
  skills: string[];
  issuedAt: Date | string;
  expiresAt: Date | string | null;
  score: number | null;
}

/**
 * Builds the byte string that actually gets signed.
 *
 * Canonicalisation matters more than it looks: verification recomputes this
 * from database columns months later, so the encoding must be completely
 * deterministic. Keys are emitted in a fixed order (never `JSON.stringify` of
 * an object, whose key order depends on insertion), dates are normalised to
 * UTC ISO-8601, and skills are sorted so that a reordered list still verifies.
 */
export function canonicalize(payload: CertificatePayload): string {
  const toIso = (value: Date | string | null): string => {
    if (value === null) return '';
    return (value instanceof Date ? value : new Date(value)).toISOString();
  };

  return [
    'v1',
    payload.certificateId,
    payload.holderName.trim(),
    payload.trackName.trim(),
    payload.issuerName.trim(),
    [...payload.skills].sort().join(','),
    toIso(payload.issuedAt),
    toIso(payload.expiresAt),
    payload.score === null ? '' : String(payload.score),
  ].join('|');
}

let cachedPrivateKey: crypto.KeyObject | null = null;
let cachedPublicKey: crypto.KeyObject | null = null;

function privateKey(): crypto.KeyObject {
  cachedPrivateKey ??= crypto.createPrivateKey(env.CERT_SIGNING_PRIVATE_KEY);
  return cachedPrivateKey;
}

function publicKey(): crypto.KeyObject {
  cachedPublicKey ??= crypto.createPublicKey(env.CERT_SIGNING_PUBLIC_KEY);
  return cachedPublicKey;
}

export function signCertificate(payload: CertificatePayload): { signature: string; keyId: string } {
  const signature = crypto.sign(null, Buffer.from(canonicalize(payload), 'utf8'), privateKey());
  return {
    signature: signature.toString('base64url'),
    keyId: env.CERT_SIGNING_KEY_ID,
  };
}

/**
 * Returns false for a tampered certificate, a signature made with a key we no
 * longer hold, or malformed input. Never throws: a verification failure is a
 * normal outcome, not an exceptional one.
 */
export function verifyCertificateSignature(
  payload: CertificatePayload,
  signature: string,
  keyId: string,
): boolean {
  // Key rotation lands here: look the historic public key up by keyId instead
  // of always using the current one.
  if (keyId !== env.CERT_SIGNING_KEY_ID) {
    logger.warn({ keyId, current: env.CERT_SIGNING_KEY_ID }, 'Certificate signed with unknown key');
    return false;
  }

  try {
    return crypto.verify(
      null,
      Buffer.from(canonicalize(payload), 'utf8'),
      publicKey(),
      Buffer.from(signature, 'base64url'),
    );
  } catch (error) {
    logger.warn({ err: error }, 'Certificate signature verification threw');
    return false;
  }
}

/**
 * Public identifier in the form SS-2026-4F8A-21D9.
 *
 * Uses crypto.randomInt rather than Math.random, and a 32-bit random tail, so
 * identifiers are neither guessable nor enumerable — the verify endpoint is
 * public, so a predictable scheme would let anyone harvest real certificates.
 * The alphabet omits I, O, 0 and 1 to survive being read aloud or retyped.
 */
const ID_ALPHABET = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';

export function generateCertificateId(issuedAt: Date = new Date()): string {
  const block = (length: number) =>
    Array.from(
      { length },
      () => ID_ALPHABET[crypto.randomInt(0, ID_ALPHABET.length)] ?? '2',
    ).join('');
  return ['SS', String(issuedAt.getUTCFullYear()), block(4), block(4)].join('-');
}

/** Cheap shape check before hitting the database on a public endpoint. */
export function looksLikeCertificateId(value: string): boolean {
  return CERTIFICATE_ID_PATTERN.test(value.trim());
}
