import { PrismaClient } from '@prisma/client';
import { isProduction } from '../config/env.js';

/**
 * A single client instance is reused across hot reloads in development,
 * otherwise `tsx watch` would open a new connection pool on every save.
 */
const globalForPrisma = globalThis as typeof globalThis & {
  prisma?: PrismaClient;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: isProduction ? ['error'] : ['warn', 'error'],
  });

if (!isProduction) globalForPrisma.prisma = prisma;
