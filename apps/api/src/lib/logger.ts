import pino from 'pino';
import { env, isProduction } from '../config/env.js';
export const logger = pino({
    level: isProduction ? 'info' : 'debug',
    // Never let a secret reach the log stream.
    redact: {
        paths: [
            'req.headers.authorization',
            'req.headers.cookie',
            'res.headers["set-cookie"]',
            '*.password',
            '*.confirmPassword',
            '*.passwordHash',
            '*.token',
        ],
        censor: '[redacted]',
    },
    transport: isProduction
        ? undefined
        : {
            target: 'pino-pretty',
            options: { colorize: true, translateTime: 'HH:MM:ss', ignore: 'pid,hostname' },
        },
    base: { env: env.NODE_ENV },
});
