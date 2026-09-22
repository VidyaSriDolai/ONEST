import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { CheckCheck, Mail, Shield, User } from 'lucide-react';
import { ROLE_LABEL } from '@skillseal/shared';
import { Seo } from '@/components/seo/Seo';
import { Button } from '@/components/ui/Button';
import { Badge, Card, CardHeader, Skeleton } from '@/components/ui/primitives';
import { useAuth } from '@/features/auth/AuthProvider';
import { studentApi, type NotificationView } from './student-api';
import { NotificationList } from './NotificationList';

export default function ProfilePage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data, isPending } = useQuery<NotificationView[]>({
    queryKey: ['student', 'notifications'],
    queryFn: studentApi.notifications,
  });

  const markAll = useMutation({
    mutationFn: studentApi.markAllRead,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['student'] });
      void queryClient.invalidateQueries({ queryKey: ['notifications', 'unread'] });
    },
  });

  const unread = data?.filter((n) => !n.read).length ?? 0;

  return (
    <>
      <Seo
        title="Notifications & profile"
        description="Your notifications and account details."
        path="/student/profile"
        noIndex
      />

      <div className="px-4 py-6 sm:px-6 sm:py-8">
        <header>
          <h1 className="font-display text-2xl font-extrabold tracking-tight sm:text-3xl">
            Notifications & profile
          </h1>
        </header>

        <div className="mt-6 grid gap-6 lg:grid-cols-3">
          {/* Notifications --------------------------------------------------- */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader
                title={
                  <span className="flex items-center gap-2">
                    Notifications
                    {unread > 0 && <Badge tone="brand">{unread} unread</Badge>}
                  </span>
                }
                action={
                  unread > 0 ? (
                    <Button
                      variant="ghost"
                      size="sm"
                      isLoading={markAll.isPending}
                      loadingText="Marking…"
                      onClick={() => markAll.mutate()}
                    >
                      <CheckCheck className="size-4" aria-hidden="true" />
                      Mark all read
                    </Button>
                  ) : undefined
                }
              />
              <div className="p-2">
                {isPending ? (
                  <div className="space-y-2 p-3">
                    <Skeleton className="h-14 w-full" />
                    <Skeleton className="h-14 w-full" />
                    <Skeleton className="h-14 w-full" />
                  </div>
                ) : (
                  <NotificationList notifications={data ?? []} />
                )}
              </div>
            </Card>
          </div>

          {/* Profile --------------------------------------------------------- */}
          <div>
            <Card>
              <CardHeader title="Your account" />
              <div className="p-5">
                <div className="flex items-center gap-3">
                  <span
                    className="flex size-14 items-center justify-center rounded-full bg-brand-100 font-display text-lg font-bold text-brand-700"
                    aria-hidden="true"
                  >
                    {user?.fullName
                      .split(' ')
                      .filter(Boolean)
                      .slice(0, 2)
                      .map((part) => part[0]?.toUpperCase() ?? '')
                      .join('')}
                  </span>
                  <div className="min-w-0">
                    <p className="font-display text-base font-bold text-ink-900">
                      {user?.fullName}
                    </p>
                    <p className="text-sm text-ink-500">
                      {user ? ROLE_LABEL[user.role] : ''}
                    </p>
                  </div>
                </div>

                <dl className="mt-5 space-y-3.5 border-t border-ink-200 pt-5">
                  {/* A <dl> may only contain dt, dd, div, script or template,
                      and a wrapping div must hold the dt/dd pair directly.
                      The icon therefore sits inside the dt, not beside it. */}
                  <div>
                    <dt className="flex items-center gap-2 text-xs text-ink-500">
                      <Mail className="size-4 shrink-0 text-ink-400" aria-hidden="true" />
                      Email
                    </dt>
                    <dd className="mt-0.5 truncate pl-6 text-sm font-medium text-ink-900">
                      {user?.email}
                    </dd>
                  </div>

                  <div>
                    <dt className="flex items-center gap-2 text-xs text-ink-500">
                      <Shield className="size-4 shrink-0 text-ink-400" aria-hidden="true" />
                      Email verified
                    </dt>
                    <dd className="mt-1 pl-6">
                      {user?.emailVerified ? (
                        <Badge tone="valid">Verified</Badge>
                      ) : (
                        <Badge tone="accent">Not verified</Badge>
                      )}
                    </dd>
                  </div>

                  <div>
                    <dt className="flex items-center gap-2 text-xs text-ink-500">
                      <User className="size-4 shrink-0 text-ink-400" aria-hidden="true" />
                      Member since
                    </dt>
                    <dd className="mt-0.5 pl-6 text-sm font-medium text-ink-900">
                      {user
                        ? new Date(user.createdAt).toLocaleDateString(undefined, {
                            month: 'long',
                            year: 'numeric',
                          })
                        : '—'}
                    </dd>
                  </div>
                </dl>

                {/* Editing lands with the account-settings work; showing a
                    disabled control is more honest than a button that fails. */}
                <Button variant="secondary" fullWidth className="mt-5" disabled>
                  Edit profile
                </Button>
                <p className="mt-2 text-center text-xs text-ink-500">
                  Profile editing arrives with account settings.
                </p>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </>
  );
}
