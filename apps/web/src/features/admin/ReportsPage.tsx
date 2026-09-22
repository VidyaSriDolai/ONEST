import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Download, ExternalLink, RefreshCw, Radio } from 'lucide-react';
import { Seo } from '@/components/seo/Seo';
import { Alert } from '@/components/ui/Alert';
import { TableScroll } from '@/components/ui/TableScroll';
import { Button } from '@/components/ui/Button';
import { Badge, Card, CardHeader, EmptyState, Skeleton } from '@/components/ui/primitives';
import { ApiError } from '@/lib/api-client';
import { cn } from '@/lib/cn';
import { adminApi, type OnestSyncRow, type PlatformReport } from './admin-api';

function downloadCsv(filename: string, header: string[], rows: string[][]): void {
  const escape = (value: string) => '"' + value.replace(/"/g, '""') + '"';
  const csv = [header.join(','), ...rows.map((row) => row.map(escape).join(','))].join('\r\n');
  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8;' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = filename + '-' + new Date().toISOString().slice(0, 10) + '.csv';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

const ONEST_TONE: Record<string, 'valid' | 'accent' | 'danger'> = {
  PUBLISHED: 'valid',
  PENDING: 'accent',
  FAILED: 'danger',
};

export default function ReportsPage() {
  const queryClient = useQueryClient();
  const [error, setError] = useState<string | null>(null);

  const reports = useQuery<PlatformReport>({
    queryKey: ['admin', 'reports'],
    queryFn: adminApi.reports,
  });

  const onest = useQuery<OnestSyncRow[]>({
    queryKey: ['admin', 'onest'],
    queryFn: adminApi.onest,
  });

  const retry = useMutation({
    mutationFn: (certificateId: string) => adminApi.retryOnest(certificateId),
    onSuccess: () => {
      setError(null);
      void queryClient.invalidateQueries({ queryKey: ['admin'] });
    },
    onError: (err) => setError(err instanceof ApiError ? err.message : 'Retry failed.'),
  });

  const pending = (onest.data ?? []).filter((row) => row.onestStatus !== 'PUBLISHED');

  return (
    <>
      <Seo
        title="Reports & ONEST sync"
        description="Platform reports and ONEST publication status."
        path="/admin/reports"
        noIndex
      />

      <div className="px-4 py-6 sm:px-6 sm:py-8">
        <header>
          <h1 className="font-display text-2xl font-extrabold tracking-tight sm:text-3xl">
            Reports & ONEST sync
          </h1>
          <p className="mt-2 text-ink-600">
            Programme performance, and whether credentials made it onto the network.
          </p>
        </header>

        {error && <Alert tone="error" className="mt-4">{error}</Alert>}

        {/* Enrolment report --------------------------------------------------- */}
        <Card className="mt-6">
          <CardHeader
            title="Enrolment & completion"
            action={
              <Button
                variant="secondary"
                size="sm"
                disabled={!reports.data?.enrollment.length}
                onClick={() =>
                  downloadCsv(
                    'enrolment-report',
                    ['Course', 'Enrolled', 'Completed', 'Rate %'],
                    (reports.data?.enrollment ?? []).map((r) => [
                      r.course,
                      String(r.enrolled),
                      String(r.completed),
                      String(r.rate),
                    ]),
                  )
                }
              >
                <Download className="size-4" aria-hidden="true" />
                CSV
              </Button>
            }
          />
          {reports.isPending ? (
            <div className="space-y-2 p-5">
              <Skeleton className="h-10 w-full" />
            </div>
          ) : (
            <TableScroll label="Enrolment and completion by course">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-ink-200 bg-ink-50">
                  <tr>
                    <th scope="col" className="px-5 py-3 font-semibold text-ink-600">Course</th>
                    <th scope="col" className="px-5 py-3 font-semibold text-ink-600">Enrolled</th>
                    <th scope="col" className="px-5 py-3 font-semibold text-ink-600">Completed</th>
                    <th scope="col" className="px-5 py-3 font-semibold text-ink-600">Rate</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-ink-200">
                  {reports.data?.enrollment.map((row) => (
                    <tr key={row.course} className="transition hover:bg-ink-50">
                      <td className="px-5 py-3 font-medium text-ink-900">{row.course}</td>
                      <td className="px-5 py-3 text-ink-600">{row.enrolled}</td>
                      <td className="px-5 py-3 text-ink-600">{row.completed}</td>
                      <td className="px-5 py-3 font-semibold text-ink-900">{row.rate}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </TableScroll>
          )}
        </Card>

        {/* Assessment report -------------------------------------------------- */}
        <Card className="mt-6">
          <CardHeader
            title="Assessment performance"
            action={
              <Button
                variant="secondary"
                size="sm"
                disabled={!reports.data?.assessment.length}
                onClick={() =>
                  downloadCsv(
                    'assessment-report',
                    ['Course', 'Attempts', 'Passed', 'Average score'],
                    (reports.data?.assessment ?? []).map((r) => [
                      r.course,
                      String(r.attempts),
                      String(r.passed),
                      String(r.averageScore),
                    ]),
                  )
                }
              >
                <Download className="size-4" aria-hidden="true" />
                CSV
              </Button>
            }
          />
          {reports.isPending ? (
            <div className="space-y-2 p-5">
              <Skeleton className="h-10 w-full" />
            </div>
          ) : (
            <TableScroll label="Assessment performance by course">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-ink-200 bg-ink-50">
                  <tr>
                    <th scope="col" className="px-5 py-3 font-semibold text-ink-600">Course</th>
                    <th scope="col" className="px-5 py-3 font-semibold text-ink-600">Attempts</th>
                    <th scope="col" className="px-5 py-3 font-semibold text-ink-600">Passed</th>
                    <th scope="col" className="px-5 py-3 font-semibold text-ink-600">Avg score</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-ink-200">
                  {reports.data?.assessment.map((row) => (
                    <tr key={row.course} className="transition hover:bg-ink-50">
                      <td className="px-5 py-3 font-medium text-ink-900">{row.course}</td>
                      <td className="px-5 py-3 text-ink-600">{row.attempts}</td>
                      <td className="px-5 py-3 text-ink-600">{row.passed}</td>
                      <td className="px-5 py-3 font-semibold text-ink-900">
                        {row.attempts === 0 ? '—' : row.averageScore + '%'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </TableScroll>
          )}
        </Card>

        {/* Verification stats -------------------------------------------------- */}
        <Card className="mt-6">
          <CardHeader title="Verification outcomes" description="Every check ever run" />
          <div className="flex flex-wrap gap-3 p-5">
            {reports.isPending ? (
              <Skeleton className="h-16 w-full" />
            ) : reports.data?.verification.length ? (
              reports.data.verification.map((row) => (
                <div
                  key={row.result}
                  className="min-w-32 flex-1 rounded-xl bg-ink-50 p-4 ring-1 ring-inset ring-ink-200"
                >
                  <p className="font-mono text-[11px] font-bold uppercase tracking-wide text-ink-500">
                    {row.result.replace('_', ' ')}
                  </p>
                  <p className="mt-1 font-display text-2xl font-extrabold text-ink-900">
                    {row.count}
                  </p>
                </div>
              ))
            ) : (
              <p className="text-sm text-ink-500">No verifications recorded yet.</p>
            )}
          </div>
        </Card>

        {/* ONEST sync ---------------------------------------------------------- */}
        <Card className="mt-6">
          <CardHeader
            title={
              <span className="flex items-center gap-2">
                <Radio className="size-4 text-ink-400" aria-hidden="true" />
                ONEST publication
              </span>
            }
            description={
              pending.length > 0
                ? pending.length + ' certificate(s) not yet published'
                : 'All certificates published'
            }
          />

          {onest.isPending ? (
            <div className="space-y-2 p-5">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          ) : onest.data?.length ? (
            <TableScroll label="ONEST publication status">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-ink-200 bg-ink-50">
                  <tr>
                    <th scope="col" className="px-5 py-3 font-semibold text-ink-600">Certificate</th>
                    <th scope="col" className="hidden px-5 py-3 font-semibold text-ink-600 md:table-cell">
                      Holder
                    </th>
                    <th scope="col" className="px-5 py-3 font-semibold text-ink-600">Status</th>
                    <th scope="col" className="px-5 py-3 text-right font-semibold text-ink-600">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-ink-200">
                  {onest.data.map((row) => (
                    <tr key={row.certificateId} className="transition hover:bg-ink-50">
                      <td className="px-5 py-3">
                        <Link
                          to={'/verify/' + row.certificateId}
                          className="inline-flex items-center gap-1.5 font-mono text-xs text-brand-700 hover:underline"
                        >
                          {row.certificateId}
                          <ExternalLink className="size-3" aria-hidden="true" />
                        </Link>
                        <span className="block text-xs text-ink-500">{row.trackName}</span>
                      </td>
                      <td className="hidden px-5 py-3 text-ink-600 md:table-cell">
                        {row.holderName}
                      </td>
                      <td className="px-5 py-3">
                        <Badge tone={ONEST_TONE[row.onestStatus] ?? 'neutral'}>
                          {row.onestStatus.charAt(0) + row.onestStatus.slice(1).toLowerCase()}
                        </Badge>
                        {row.onestError && (
                          <span className="mt-1 block max-w-48 truncate text-xs text-danger-600">
                            {row.onestError}
                          </span>
                        )}
                      </td>
                      <td className="px-5 py-3 text-right">
                        {row.onestStatus !== 'PUBLISHED' && (
                          <Button
                            variant="ghost"
                            size="sm"
                            isLoading={retry.isPending && retry.variables === row.certificateId}
                            onClick={() => retry.mutate(row.certificateId)}
                          >
                            <RefreshCw
                              className={cn('size-4', retry.isPending && 'animate-spin')}
                              aria-hidden="true"
                            />
                            Retry
                          </Button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </TableScroll>
          ) : (
            <div className="p-5">
              <EmptyState icon={<Radio className="size-6" />} title="No certificates to publish" />
            </div>
          )}
        </Card>

        <Alert tone="info" className="mt-4">
          Retry currently marks the certificate as published directly. Once the Beckn BPP adapter
          is wired up it will enqueue a real network publication instead.
        </Alert>
      </div>
    </>
  );
}
