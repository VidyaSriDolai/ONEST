import 'dotenv/config';
import { z } from 'zod';
/**
 * Environment is validated once at boot. A misconfigured deploy fails loudly
 * here instead of throwing an obscure error on the first request.
 */
const envSchema = z.object({
    NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
    PORT: z.coerce.number().int().positive().default(4000),
    CORS_ORIGINS: z
        .string()
        .default('http://localhost:5173')
        .transform((v) => v.split(',').map((s) => s.trim()).filter(Boolean)),
    DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),
    JWT_ACCESS_SECRET: z.string().min(32, 'JWT_ACCESS_SECRET must be at least 32 characters'),
    JWT_REFRESH_SECRET: z.string().min(32, 'JWT_REFRESH_SECRET must be at least 32 characters'),
    ACCESS_TOKEN_TTL: z.string().default('15m'),
    REFRESH_TOKEN_TTL_DAYS: z.coerce.number().int().positive().default(30),
    WEB_APP_URL: z.string().url().default('http://localhost:5173'),
    // Certificate signing. Validated as real PEM blocks at boot so a malformed
    // key fails here rather than on the first certificate issued.
    // Dashboard env-var fields cannot hold real newlines, so a literal "\n"
    // escape is normalised to an actual newline before validation.
    CERT_SIGNING_KEY_ID: z.string().min(1).default('dev-2026-01'),
    CERT_SIGNING_PRIVATE_KEY: z
        .string()
        .transform((v) => v.replace(/\\n/g, '\n'))
        .pipe(
            z
                .string()
                .min(1, 'CERT_SIGNING_PRIVATE_KEY is required')
                .refine((v) => v.includes('BEGIN PRIVATE KEY'), 'CERT_SIGNING_PRIVATE_KEY must be a PKCS#8 PEM block'),
        ),
    CERT_SIGNING_PUBLIC_KEY: z
        .string()
        .transform((v) => v.replace(/\\n/g, '\n'))
        .pipe(
            z
                .string()
                .min(1, 'CERT_SIGNING_PUBLIC_KEY is required')
                .refine((v) => v.includes('BEGIN PUBLIC KEY'), 'CERT_SIGNING_PUBLIC_KEY must be an SPKI PEM block'),
        ),
});
const parsed = envSchema.safeParse(process.env);
if (!parsed.success) {
    const issues = parsed.error.issues
        .map((i) => `  - ${i.path.join('.')}: ${i.message}`)
        .join('\n');
    console.error(`\nInvalid environment configuration:\n${issues}\n`);
    console.error('Copy apps/api/.env.example to apps/api/.env and fill in the blanks.\n');
    process.exit(1);
}
export const env = parsed.data;
export const isProduction = env.NODE_ENV === 'production';
export const isDevelopment = env.NODE_ENV === 'development';
