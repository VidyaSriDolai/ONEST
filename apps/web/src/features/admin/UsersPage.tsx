import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Building2, Search, Users } from 'lucide-react';
import { ALL_ROLES, ROLE_LABEL, type Role } from '@skillseal/shared';
import { Seo } from '@/components/seo/Seo';
import { Alert } from '@/components/ui/Alert';
import { TableScroll } from '@/components/ui/TableScroll';
import { Button } from '@/components/ui/Button';
import { Badge, Card, CardHeader, EmptyState, Skeleton } from '@/components/ui/primitives';
import { ApiError } from '@/lib/api-client';
import { useAuth } from '@/features/auth/AuthProvider';
import { cn } from '@/lib/cn';
import { adminApi, type AdminOrganizationRow, type AdminUserRow } from './admin-api';

const ROLE_TONE: Record<string, 'brand' | 'valid' | 'accent' | 'danger' | 'neutral'> = {
  STUDENT: 'brand',
  COMPANY: 'valid',
  HR: 'accent',
  ADMIN: 'danger',
};

function UsersTab() {
  const { user: me } = useAuth();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [error, setError] = useState<string | null>(null);

  const { data, isPending } = useQuery<AdminUserRow[]>({
    queryKey: ['admin', 'users', search],
    queryFn: () => adminApi.users(search || undefined),
  });

  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: ['admin'] });
  };

  const toggleActive = useMutation({
    mutationFn: ({ id, next }: { id: string; next: boolean }) => adminApi.setUserActive(id, next),
    onSuccess: () => {
      setError(null);
      invalidate();
    },
    onError: (err) => setError(err instanceof ApiError ? err.message : 'Could not update.'),
  });

  const changeRole = useMutation({
    mutationFn: ({ id, role }: { id: string; role: string }) => adminApi.changeRole(id, role),
    onSuccess: () => {
      setError(null);
      invalidate();
    },
    onError: (err) => setError(err instanceof ApiError ? err.message : 'Could not change role.'),
  });

  return (
    <>
      {error && <Alert tone="error" className="mb-4">{error}</Alert>}

      <Card>
        <CardHeader
          title={(data?.length ?? 0) + ' users'}
          action={
            <div className="relative">
              <label htmlFor="admin-user-search" className="sr-only">
                Search users
              </label>
              <Search
                className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-ink-400"
                aria-hidden="true"
              />
              <input
                id="admin-user-search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Name or email"
                className="w-48 rounded-lg border-0 bg-surface py-2 pl-9 pr-3 text-sm ring-1 ring-inset ring-ink-200 focus:ring-2 focus:ring-inset focus:ring-brand-500"
              />
            </div>
          }
        />

        {isPending ? (
          <div className="space-y-2 p-5">
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
          </div>
        ) : data?.length ? (
          <TableScroll label="User accounts">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-ink-200 bg-ink-50">
                <tr>
                  <th scope="col" className="px-5 py-3 font-semibold text-ink-600">User</th>
                  <th scope="col" className="hidden px-5 py-3 font-semibold text-ink-600 md:table-cell">
                    Organisation
                  </th>
                  <th scope="col" className="px-5 py-3 font-semibold text-ink-600">Role</th>
                  <th scope="col" className="px-5 py-3 font-semibold text-ink-600">Status</th>
                  <th scope="col" className="px-5 py-3 text-right font-semibold text-ink-600">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ink-200">
                {data.map((row) => {
                  const isSelf = row.id === me?.id;
                  return (
                    <tr key={row.id} className={cn('transition hover:bg-ink-50', !row.isActive && 'opacity-60')}>
                      <td className="px-5 py-3">
                        <span className="block font-medium text-ink-900">
                          {row.fullName}
                          {isSelf && <span className="ml-1.5 text-xs text-ink-500">(you)</span>}
                        </span>
                        <span className="block text-xs text-ink-500">{row.email}</span>
                      </td>
                      <td className="hidden px-5 py-3 text-ink-600 md:table-cell">
                        {row.organizationName ?? '—'}
                      </td>
                      <td className="px-5 py-3">
                        {isSelf ? (
                          <Badge tone={ROLE_TONE[row.role] ?? 'neutral'}>
                            {ROLE_LABEL[row.role as Role] ?? row.role}
                          </Badge>
                        ) : (
                          <>
                            <label htmlFor={'role-' + row.id} className="sr-only">
                              Role for {row.fullName}
                            </label>
                            <select
                              id={'role-' + row.id}
                              value={row.role}
                              onChange={(e) => changeRole.mutate({ id: row.id, role: e.target.value })}
                              disabled={changeRole.isPending}
                              className="rounded-lg border-0 bg-surface py-1.5 pl-2.5 pr-7 text-xs ring-1 ring-inset ring-ink-200 focus:ring-2 focus:ring-inset focus:ring-brand-500"
                            >
                              {ALL_ROLES.map((role) => (
                                <option key={role} value={role}>
                                  {ROLE_LABEL[role]}
                                </option>
                              ))}
                            </select>
                          </>
                        )}
                      </td>
                      <td className="px-5 py-3">
                        {row.isActive ? (
                          <Badge tone="valid">Active</Badge>
                        ) : (
                          <Badge tone="danger">Deactivated</Badge>
                        )}
                      </td>
                      <td className="px-5 py-3 text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          disabled={isSelf && row.isActive}
                          isLoading={toggleActive.isPending && toggleActive.variables?.id === row.id}
                          className={row.isActive ? 'text-danger-600 hover:bg-danger-50' : ''}
                          onClick={() => toggleActive.mutate({ id: row.id, next: !row.isActive })}
                        >
                          {row.isActive ? 'Deactivate' : 'Activate'}
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </TableScroll>
        ) : (
          <div className="p-5">
            <EmptyState icon={<Users className="size-6" />} title="No users match that search" />
          </div>
        )}
      </Card>

      <p className="mt-3 text-xs text-ink-500">
        Changing a role or deactivating an account revokes that user's live sessions immediately.
      </p>
    </>
  );
}

function OrganizationsTab() {
  const { data, isPending } = useQuery<AdminOrganizationRow[]>({
    queryKey: ['admin', 'organizations'],
    queryFn: adminApi.organizations,
  });

  return (
    <Card>
      <CardHeader title={(data?.length ?? 0) + ' organisations'} />
      {isPending ? (
        <div className="space-y-2 p-5">
          <Skeleton className="h-12 w-full" />
        </div>
      ) : data?.length ? (
        <TableScroll label="Organisations">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-ink-200 bg-ink-50">
              <tr>
                <th scope="col" className="px-5 py-3 font-semibold text-ink-600">Organisation</th>
                <th scope="col" className="px-5 py-3 font-semibold text-ink-600">Kind</th>
                <th scope="col" className="px-5 py-3 font-semibold text-ink-600">Users</th>
                <th scope="col" className="px-5 py-3 font-semibold text-ink-600">Courses</th>
                <th scope="col" className="px-5 py-3 font-semibold text-ink-600">Certificates</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ink-200">
              {data.map((row) => (
                <tr key={row.id} className="transition hover:bg-ink-50">
                  <td className="px-5 py-3">
                    <span className="block font-medium text-ink-900">{row.name}</span>
                    <span className="block font-mono text-xs text-ink-500">{row.slug}</span>
                  </td>
                  <td className="px-5 py-3">
                    <Badge tone={row.kind === 'EMPLOYER' ? 'accent' : 'brand'}>
                      {row.kind === 'EMPLOYER' ? 'Employer' : 'Provider'}
                    </Badge>
                  </td>
                  <td className="px-5 py-3 text-ink-600">{row.userCount}</td>
                  <td className="px-5 py-3 text-ink-600">{row.courseCount}</td>
                  <td className="px-5 py-3 text-ink-600">{row.certificateCount}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </TableScroll>
      ) : (
        <div className="p-5">
          <EmptyState icon={<Building2 className="size-6" />} title="No organisations yet" />
        </div>
      )}
    </Card>
  );
}

export default function UsersPage() {
  const [tab, setTab] = useState<'users' | 'orgs'>('users');

  return (
    <>
      <Seo
        title="Users & organisations"
        description="Manage accounts and organisations."
        path="/admin/users"
        noIndex
      />

      <div className="px-4 py-6 sm:px-6 sm:py-8">
        <header>
          <h1 className="font-display text-2xl font-extrabold tracking-tight sm:text-3xl">
            Users & organisations
          </h1>
          <p className="mt-2 text-ink-600">Accounts, roles and the organisations they belong to.</p>
        </header>

        {/* Tabs ------------------------------------------------------------ */}
        <div className="mt-6 flex gap-1 border-b border-ink-200" role="tablist">
          {(
            [
              { id: 'users', label: 'Users', icon: Users },
              { id: 'orgs', label: 'Organisations', icon: Building2 },
            ] as const
          ).map((item) => (
            <button
              key={item.id}
              type="button"
              role="tab"
              aria-selected={tab === item.id}
              onClick={() => setTab(item.id)}
              className={cn(
                '-mb-px flex items-center gap-2 border-b-2 px-4 py-2.5 text-sm font-semibold transition',
                tab === item.id
                  ? 'border-brand-600 text-brand-700'
                  : 'border-transparent text-ink-500 hover:text-ink-900',
              )}
            >
              <item.icon className="size-4" aria-hidden="true" />
              {item.label}
            </button>
          ))}
        </div>

        <div className="mt-5">{tab === 'users' ? <UsersTab /> : <OrganizationsTab />}</div>
      </div>
    </>
  );
}
