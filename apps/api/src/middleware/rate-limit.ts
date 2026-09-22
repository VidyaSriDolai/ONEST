import rateLimit, {} from 'express-rate-limit';
import { isProduction } from '../config/env.js';
const failure = {
    ok: false,
    error: {
        code: 'RATE_LIMITED',
        message: 'Too many attempts from this address. Please wait a minute and try again.',
    },
};
function build(options: Parameters<typeof rateLimit>[0]) {
    return rateLimit({
        standardHeaders: 'draft-7',
        legacyHeaders: false,
        // Local development would otherwise trip the limiter during UI testing.
        skip: () => !isProduction && process.env.RATE_LIMIT_IN_DEV !== 'true',
        handler: (_req, res) => {
            res.status(429).json(failure);
        },
        ...options,
    });
}
/** Broad ceiling for the whole API surface. */
export const globalLimiter = build({ windowMs: 60_000, limit: 300 });
/** Tight ceiling for credential endpoints: login, register, reset. */
export const authLimiter = build({ windowMs: 15 * 60_000, limit: 20 });
/** Password reset is the most abusable endpoint (it sends mail). */
export const passwordResetLimiter = build({ windowMs: 60 * 60_000, limit: 5 });
