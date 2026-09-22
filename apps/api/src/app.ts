import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import pinoHttp from 'pino-http';
import { env, isProduction } from './config/env.js';
import { logger } from './lib/logger.js';
import { apiRouter } from './routes/index.js';
import { errorHandler, notFoundHandler } from './middleware/error-handler.js';
import { globalLimiter } from './middleware/rate-limit.js';

export function createApp(): express.Express {
  const app = express();

  // Required for correct client IPs (rate limiting, audit log) behind a proxy.
  app.set('trust proxy', 1);
  app.disable('x-powered-by');

  app.use(
    helmet({
      // The API serves JSON only; CSP is enforced by the web app instead.
      contentSecurityPolicy: false,
      crossOriginResourcePolicy: { policy: 'cross-origin' },
    }),
  );

  app.use(
    cors({
      origin(origin, callback) {
        // Same-origin and non-browser callers (curl, health checks) send no Origin.
        if (!origin || env.CORS_ORIGINS.includes(origin)) {
          callback(null, true);
          return;
        }
        callback(new Error('Origin ' + origin + ' is not allowed by CORS'));
      },
      // Needed for the httpOnly refresh cookie to travel cross-origin in dev.
      credentials: true,
    }),
  );

  app.use(express.json({ limit: '100kb' }));
  app.use(express.urlencoded({ extended: true, limit: '100kb' }));
  app.use(cookieParser());

  app.use(
    pinoHttp({
      logger,
      // Health checks would otherwise drown the log in noise.
      autoLogging: { ignore: (req) => req.url?.startsWith('/api/health') ?? false },
    }),
  );

  app.use('/api', globalLimiter, apiRouter);
  app.use(notFoundHandler);
  app.use(errorHandler);

  if (!isProduction) {
    logger.debug({ corsOrigins: env.CORS_ORIGINS }, 'CORS configured');
  }

  return app;
}
