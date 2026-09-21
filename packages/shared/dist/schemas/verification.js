import { z } from 'zod';
/**
 * Public identifier format: SS-2026-4F8A-21D9.
 * Shared so the HR form, the public page and the API all agree on what a
 * well-formed certificate ID looks like before a lookup is attempted.
 */
export const CERTIFICATE_ID_PATTERN = /^SS-\d{4}-[A-Z0-9]{4}-[A-Z0-9]{4}$/i;
export const certificateIdSchema = z
    .string()
    .trim()
    .min(1, 'Enter a certificate ID')
    .transform((v) => v.toUpperCase())
    .refine((v) => CERTIFICATE_ID_PATTERN.test(v), 'That does not look like a certificate ID. The format is SS-2026-4F8A-21D9.');
export const verifyCertificateSchema = z.object({ certificateId: certificateIdSchema });
/** Normalises user input: strips spaces and inserts the dashes if omitted. */
export function normalizeCertificateId(raw) {
    const cleaned = raw.trim().toUpperCase().replace(/[\s-]/g, '');
    const match = /^SS(\d{4})([A-Z0-9]{4})([A-Z0-9]{4})$/.exec(cleaned);
    return match ? `SS-${match[1]}-${match[2]}-${match[3]}` : raw.trim().toUpperCase();
}
//# sourceMappingURL=verification.js.map