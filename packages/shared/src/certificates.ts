/**
 * Outcome of a verification. Ordered from best to worst so a UI can style
 * them consistently.
 *
 * TAMPERED is distinct from INVALID on purpose: INVALID means "no such
 * certificate", while TAMPERED means the record exists but its stored data no
 * longer matches its cryptographic signature — which implies the database was
 * edited directly. That is a security incident, not a typo, and the UI says so.
 */
export const VERIFICATION_RESULTS = ['VALID', 'EXPIRED', 'REVOKED', 'TAMPERED', 'NOT_FOUND'] as const;
export type VerificationResult = (typeof VERIFICATION_RESULTS)[number];

export const ONEST_SYNC_STATUSES = ['PENDING', 'PUBLISHED', 'FAILED'] as const;
export type OnestSyncStatus = (typeof ONEST_SYNC_STATUSES)[number];

/** The certificate body, returned only when the credential actually exists. */
export interface VerifiedCertificate {
  certificateId: string;
  holderName: string;
  trackName: string;
  issuerName: string;
  skills: string[];
  score: number | null;
  nsqfLevel: number | null;
  issuedAt: string;
  expiresAt: string | null;
  revokedAt: string | null;
  revokedReason: string | null;
  onestStatus: OnestSyncStatus;
  onestPublishedAt: string | null;
  /** Whether the stored record still matches its Ed25519 signature. */
  signatureValid: boolean;
}

export interface VerificationResponse {
  result: VerificationResult;
  /** Absent for NOT_FOUND — there is nothing to describe. */
  certificate: VerifiedCertificate | null;
  /** Server time the check ran, for the receipt shown to employers. */
  verifiedAt: string;
}

export const VERIFICATION_COPY: Record<
  VerificationResult,
  { label: string; headline: string; detail: string }
> = {
  VALID: {
    label: 'Valid',
    headline: 'This certificate is valid',
    detail: 'The credential is genuine, active, and its signature checks out.',
  },
  EXPIRED: {
    label: 'Expired',
    headline: 'This certificate has expired',
    detail: 'It was genuinely issued, but its validity period has ended.',
  },
  REVOKED: {
    label: 'Revoked',
    headline: 'This certificate has been revoked',
    detail: 'The issuer has withdrawn this credential. It should not be accepted.',
  },
  TAMPERED: {
    label: 'Invalid signature',
    headline: 'This certificate failed its integrity check',
    detail:
      'The record does not match its cryptographic signature. Do not accept it, and report it to the issuer.',
  },
  NOT_FOUND: {
    label: 'Not found',
    headline: 'No certificate with that ID',
    detail: 'Check the ID for typos, or scan the QR code on the certificate itself.',
  },
};
