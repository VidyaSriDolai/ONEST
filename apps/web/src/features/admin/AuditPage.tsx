import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Download, ScrollText, Search } from 'lucide-react';
import { Seo } from '@/components/seo/Seo';
import { Button } from '@/components/ui/Button';
import { TableScroll } from '@/components/ui/TableScroll';
import { Card, CardHeader, EmptyState, Skeleton } from '@/components/ui/primitives';
import { adminApi, type AuditLogRow } from './admin-api';
import { cn } from '@/lib/cn';

/**
 * Colour-coded action badges, per the spec.
 *
 * Grouped by what the action means rather than by name, so a new action falls
 * into a sensible colour without needing a new entry here.
 */
function actionTone(action: string): string {
  if (action.includes('REVOKED') || action.includes('FAILED') || action.includes('DEACTIVATED')) {
    return 'bg-danger-50 text-danger-700 ring-danger-100';
  }
  if (action.includes('LOCKED') || action.includes('REUSE') || action.includes('RETRIED')) {
    return 'bg-warn-50 text-accent-700 ring-accent-100';
  }
  if (action.includes('ISSUED') || action.includes('REGISTER') || action.includes('ACTIVATED')) {
    return 'bg-valid-50 text-valid-700 ring-valid-100';
  }
  if (action.includes('LOGIN') || action.includes('TOKEN')) {
    return 'bg-brand-50 text-brand-700 ring-brand-100';
  }
  return 'bg-ink-100 text-ink-600 ring-ink-200';
}

function toCsv(rows: AuditLogRow[]): string {
  const escape = (value: string) => '"' + value.replace(/"/g, '""') + '"';
  return [
    ['Action', 'Actor', 'Entity', 'IP', 'When'].join(','),
    ...rows.map((row) =>
      [
        escape(row.action),
        escape(row.actorEmail ?? ''),
        escape((row.entityType ?? '') + (row.entityId ? ':' + row.entityId : '')),
        escape(row.ipAddress ?? ''),
        escape(new Date(row.createdAt).toISOString()),
      ].join(','),
    ),
  ].join('\r\n');
}

export default function AuditPage() {
  const [action, setAction] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [search, setSearch] = useState('');

  const actions = useQuery({
    queryKey: ['admin', 'audit', 'actions'],
    queryFn: adminApi.auditActions,
    staleTime: 5 * 60_000,
  });

  const { data, isPending } = useQuery<AuditLogRow[]>({
    queryKey: ['admin', 'audit', { action, from, to, search }],
    queryFn: () => adminApi.audit({ action, from, to, search }),
  });

  function download() {
    if (!data?.length) return;
    const url = URL.createObjectURL(new Blob([toCsv(data)], { type: 'text/csv;charset=utf-8;' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = 'audit-log-' + new Date().toISOString().slice(0, 10) + '.csv';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  return (
    <>
      <Seo title="Audit logs" description="Every security-relevant action." path="/admin/audit" noIndex />

      <div className="px-4 py-6 sm:px-6 sm:py-8">
        <header className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="font-display text-2xl font-extrabold tracking-tight sm:text-3xl">
              Audit logs
            </h1>
            <p className="mt-2 text-ink-600">
              Append-only record of every security-relevant action on the platform.
            </p>
          </div>
          <Button variant="secondary" onClick={download} disabled={!data?.length}>
            <Download className="size-4" aria-hidden="true" />
            Export CSV
          </Button>
        </header>

        {/* Filters ---------------------------------------------------------- */}
        <Card className="mt-6 p-4">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <label htmlFor="audit-action" className="block text-xs font-medium text-ink-600">
                Action
              </label>
              <select
                id="audit-action"
                value={action}
                onChange={(e) => setAction(e.target.value)}
                className="mt-1 block w-full rounded-lg border-0 bg-surface py-2 pl-3 pr-8 text-sm ring-1 ring-inset ring-ink-200 focus:ring-2 focus:ring-inset focus:ring-brand-500"
              >
                <option value="">All actions</option>
                {actions.data?.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="audit-from" className="block text-xs font-medium text-ink-600">
                From
              </label>
              <input
                id="audit-from"
                type="date"
                value={from}
                onChange={(e) => setFrom(e.target.value)}
                className="mt-1 block w-full rounded-lg border-0 bg-surface py-2 px-3 text-sm ring-1 ring-inset ring-ink-200 focus:ring-2 focus:ring-inset focus:ring-brand-500"
              />
            </div>

            <div>
              <label htmlFor="audit-to" className="block text-xs font-medium text-ink-600">
                To
              </label>
              <input
                id="audit-to"
                type="date"
                value={to}
                onChange={(e) => setTo(e.target.value)}
                className="mt-1 block w-full rounded-lg border-0 bg-surface py-2 px-3 text-sm ring-1 ring-inset ring-ink-200 focus:ring-2 focus:ring-inset focus:ring-brand-500"
              />
            </div>

            <div>
              <label htmlFor="audit-search" className="block text-xs font-medium text-ink-600">
                Actor
              </label>
              <div className="relative mt-1">
                <Search
                  className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-ink-400"
                  aria-hidden="true"
                />
                <input
                  id="audit-search"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Email"
                  className="block w-full rounded-lg border-0 bg-surface py-2 pl-9 pr-3 text-sm ring-1 ring-inset ring-ink-200 focus:ring-2 focus:ring-inset focus:ring-brand-500"
                />
              </div>
            </div>
          </div>

          {(action || from || to || search) && (
            <button
              type="button"
              onClick={() => {
                setAction('');
                setFrom('');
                setTo('');
                setSearch('');
              }}
              className="mt-3 text-xs font-semibold text-brand-600 hover:underline"
            >
              Clear filters
            </button>
          )}
        </Card>

        {/* Log -------------------------------------------------------------- */}
        <Card className="mt-6">
          <CardHeader title={(data?.length ?? 0) + ' entries'} description="Newest first" />

          {isPending ? (
            <div className="space-y-2 p-5">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          ) : data?.length ? (
            <TableScroll label="Audit log entries">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-ink-200 bg-ink-50">
                  <tr>
                    <th scope="col" className="px-5 py-3 font-semibold text-ink-600">Action</th>
                    <th scope="col" className="px-5 py-3 font-semibold text-ink-600">Actor</th>
                    <th scope="col" className="hidden px-5 py-3 font-semibold text-ink-600 lg:table-cell">
                      Entity
                    </th>
                    <th scope="col" className="hidden px-5 py-3 font-semibold text-ink-600 md:table-cell">
                      IP
                    </th>
                    <th scope="col" className="px-5 py-3 font-semibold text-ink-600">When</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-ink-200">
                  {data.map((row) => (
                    <tr key={row.id} className="transition hover:bg-ink-50">
                      <td className="px-5 py-3">
                        <span
                          className={cn(
                            'inline-block whitespace-nowrap rounded-full px-2.5 py-1 font-mono text-[11px] font-bold ring-1 ring-inset',
                            actionTone(row.action),
                          )}
                        >
                          {row.action}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-ink-700">{row.actorEmail ?? '—'}</td>
                      <td className="hidden px-5 py-3 text-xs text-ink-500 lg:table-cell">
                        {row.entityType ?? '—'}
                      </td>
                      <td className="hidden px-5 py-3 font-mono text-xs text-ink-500 md:table-cell">
                        {row.ipAddress ?? '—'}
                      </td>
                      <td className="whitespace-nowrap px-5 py-3 text-xs text-ink-500">
                        {new Date(row.createdAt).toLocaleString(undefined, {
                          dateStyle: 'medium',
                          timeStyle: 'short',
                        })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </TableScroll>
          ) : (
            <div className="p-5">
              <EmptyState
                icon={<ScrollText className="size-6" />}
                title="No entries match those filters"
                description="Try widening the date range or clearing the action filter."
              />
            </div>
          )}
        </Card>
      </div>
    </>
  );
}
