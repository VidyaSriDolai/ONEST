import type { VerificationResponse } from '@skillseal/shared';
import { api } from '@/lib/api-client';

export const verificationApi = {
  /** Public lookup. No authentication — this is what a QR scan hits. */
  verifyPublic: (certificateId: string) =>
    api.get<VerificationResponse>('/api/verify/' + encodeURIComponent(certificateId)),

  /** Same check, recorded against the signed-in employer's history. */
  verifyAsHr: (certificateId: string) =>
    api.post<VerificationResponse>('/api/hr/verify', { certificateId }),
};
