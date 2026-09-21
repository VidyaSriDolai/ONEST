import { z } from 'zod';
/**
 * Public identifier format: SS-2026-4F8A-21D9.
 * Shared so the HR form, the public page and the API all agree on what a
 * well-formed certificate ID looks like before a lookup is attempted.
 */
export declare const CERTIFICATE_ID_PATTERN: RegExp;
export declare const certificateIdSchema: z.ZodEffects<z.ZodEffects<z.ZodString, string, string>, string, string>;
export declare const verifyCertificateSchema: z.ZodObject<{
    certificateId: z.ZodEffects<z.ZodEffects<z.ZodString, string, string>, string, string>;
}, "strip", z.ZodTypeAny, {
    certificateId: string;
}, {
    certificateId: string;
}>;
export type VerifyCertificateInput = z.infer<typeof verifyCertificateSchema>;
/** Normalises user input: strips spaces and inserts the dashes if omitted. */
export declare function normalizeCertificateId(raw: string): string;
//# sourceMappingURL=verification.d.ts.map