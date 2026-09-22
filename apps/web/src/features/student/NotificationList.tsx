import { Link } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Award, BadgeCheck, Bell, ClipboardCheck, GraduationCap, Info } from 'lucide-react';
import { EmptyState } from '@/components/ui/primitives';
import { studentApi, type NotificationView } from './student-api';
import { cn } from '@/lib/cn';

const TYPE_ICON: Record<string, { icon: typeof Bell; tone: string }> = {
  ENROLLMENT: { icon: GraduationCap, tone: 'bg-brand-50 text-brand-600' },
  RESULT: { icon: ClipboardCheck, tone: 'bg-accent-50 text-accent-600' },
  ELIGIBILITY: { icon: Award, tone: 'bg-valid-50 text-valid-600' },
  CERTIFICATE: { icon: BadgeCheck, tone: 'bg-valid-50 text-valid-600' },
  SYSTEM: { icon: Info, tone: 'bg-ink-100 text-ink-500' },
};

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const minutes = Math.round(diff / 60_000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return minutes + 'm ago';
  const hours = Math.round(minutes / 60);
  if (hours < 24) return hours + 'h ago';
  const days = Math.round(hours / 24);
  if (days < 30) return days + 'd ago';
  return new Date(iso).toLocaleDateString(undefined, { day: 'numeric', month: 'short' });
}

export function NotificationList({
  notifications,
  compact,
}: {
  notifications: NotificationView[];
  compact?: boolean;
}) {
  const queryClient = useQueryClient();

  const markRead = useMutation({
    mutationFn: (id: string) => studentApi.markRead(id),
    onSuccess: () => {
      // Both the feed and the bell badge depend on this.
      void queryClient.invalidateQueries({ queryKey: ['student'] });
      void queryClient.invalidateQueries({ queryKey: ['notifications', 'unread'] });
    },
  });

  if (notifications.length === 0) {
    return (
      <EmptyState
        icon={<Bell className="size-6" />}
        title="No notifications"
        description="Enrolments, results and certificates will appear here."
      />
    );
  }

  return (
    <ul className={cn('divide-y divide-ink-200', compact && 'divide-y-0 space-y-1')}>
      {notifications.map((notification) => {
        const { icon: Icon, tone } = TYPE_ICON[notification.type] ?? TYPE_ICON.SYSTEM!;

        const body = (
          <div
            className={cn(
              'flex items-start gap-3 rounded-xl px-3 py-3 transition',
              !notification.read && 'bg-brand-50/50',
              notification.link && 'hover:bg-ink-50',
            )}
          >
            <span
              className={cn('flex size-9 shrink-0 items-center justify-center rounded-lg', tone)}
              aria-hidden="true"
            >
              <Icon className="size-4.5" />
            </span>

            <div className="min-w-0 flex-1">
              <div className="flex items-start justify-between gap-2">
                <p
                  className={cn(
                    'text-sm text-ink-900',
                    notification.read ? 'font-medium' : 'font-bold',
                  )}
                >
                  {notification.title}
                </p>
                <span className="shrink-0 text-xs text-ink-600">
                  {relativeTime(notification.createdAt)}
                </span>
              </div>
              <p className="mt-0.5 text-sm leading-relaxed text-ink-600">{notification.body}</p>
            </div>

            {!notification.read && (
              <span
                className="mt-2 size-2 shrink-0 rounded-full bg-brand-600"
                aria-label="Unread"
              />
            )}
          </div>
        );

        return (
          <li key={notification.id}>
            {notification.link ? (
              <Link
                to={notification.link}
                onClick={() => !notification.read && markRead.mutate(notification.id)}
                className="block rounded-xl"
              >
                {body}
              </Link>
            ) : (
              <button
                type="button"
                onClick={() => !notification.read && markRead.mutate(notification.id)}
                className="block w-full rounded-xl text-left"
              >
                {body}
              </button>
            )}
          </li>
        );
      })}
    </ul>
  );
}
