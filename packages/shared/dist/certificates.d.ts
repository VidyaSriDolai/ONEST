/**
 * Outcome of a verification. Ordered from best to worst so a UI can style
 * them consistently.
 *
 * TAMPERED is distinct from INVALID on purpose: INVALID means "no such
 * certificate", while TAMPERED means the record exists but its stored data no
 * longer matches its cryptographic signature — which implies the database was
 * edited directly. That is a security incident, not a typo, and the UI says so.
 */
export declare const VERIFICATION_RESULTS: readonly ["VALID", "EXPIRED", "REVOKED", "TAMPERED", "NOT_FOUND"];
export type VerificationResult = (typeof VERIFICATION_RESULTS)[number];
export declare const ONEST_SYNC_STATUSES: readonly ["PENDING", "PUBLISHED", "FAILED"];
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
export declare const VERIFICATION_COPY: Record<VerificationResult, {
    label: string;
    headline: string;
    detail: string;
}>;
//# sourceMappingURL=certificates.d.ts.map