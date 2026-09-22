import { prisma } from '../../lib/prisma.js';
import { logger } from '../../lib/logger.js';

export interface NotifyInput {
  type: string;
  title: string;
  body: string;
  link?: string;
}

/**
 * Creating a notification must never break the action that triggered it, so
 * failures are logged and swallowed — same rule as the audit log.
 */
export async function notify(userId: string, input: NotifyInput): Promise<void> {
  try {
    await prisma.notification.create({
      data: {
        userId,
        type: input.type,
        title: input.title,
        body: input.body,
        link: input.link ?? null,
      },
    });
  } catch (error) {
    logger.error({ err: error, userId, type: input.type }, 'Failed to create notification');
  }
}

export async function listNotifications(userId: string, limit = 30) {
  const rows = await prisma.notification.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    take: Math.min(limit, 100),
  });
  return rows.map((row) => ({
    id: row.id,
    type: row.type,
    title: row.title,
    body: row.body,
    link: row.link,
    read: row.readAt !== null,
    createdAt: row.createdAt.toISOString(),
  }));
}

export async function unreadCount(userId: string): Promise<number> {
  return prisma.notification.count({ where: { userId, readAt: null } });
}

export async function markRead(userId: string, notificationId: string): Promise<void> {
  // Scoped by userId so one learner cannot mark another's notifications read.
  await prisma.notification.updateMany({
    where: { id: notificationId, userId, readAt: null },
    data: { readAt: new Date() },
  });
}

export async function markAllRead(userId: string): Promise<number> {
  const result = await prisma.notification.updateMany({
    where: { userId, readAt: null },
    data: { readAt: new Date() },
  });
  return result.count;
}
