import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Download, Search, Users } from 'lucide-react';
import { Seo } from '@/components/seo/Seo';
import { Button } from '@/components/ui/Button';
import { TableScroll } from '@/components/ui/TableScroll';
import {
  Badge,
  Card,
  CardHeader,
  EmptyState,
  ProgressBar,
  Skeleton,
} from '@/components/ui/primitives';
import { providerApi, type LearnerRow } from './provider-api';

function toCsv(rows: LearnerRow[]): string {
  const escape = (value: string) => '"' + value.replace(/"/g, '""') + '"';
  return [
    ['Name', 'Email', 'Course', 'Status', 'Progress %', 'Best score', 'Enrolled'].join(','),
    ...rows.map((row) =>
      [
        escape(row.fullName),
        escape(row.email),
        escape(row.courseTitle),
        escape(row.status),
        String(row.progressPercent),
        row.bestScore === null ? '' : String(row.bestScore),
        escape(new Date(row.enrolledAt).toISOString()),
      ].join(','),
    ),
  ].join('\r\n');
}

function download(rows: LearnerRow[]): void {
  const url = URL.createObjectURL(new Blob([toCsv(rows)], { type: 'text/csv;charset=utf-8;' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = 'learners-' + new Date().toISOString().slice(0, 10) + '.csv';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export default function LearnersPage() {
  const [course, setCourse] = useState('');
  const [search, setSearch] = useState('');

  const courses = useQuery({ queryKey: ['provider', 'courses'], queryFn: providerApi.courses });

  const { data, isPending } = useQuery<LearnerRow[]>({
    queryKey: ['provider', 'learners', course],
    queryFn: () => providerApi.learners(course || undefined),
  });

  const filtered = (data ?? []).filter((row) =>
    search
      ? row.fullName.toLowerCase().includes(search.toLowerCase()) ||
        row.email.toLowerCase().includes(search.toLowerCase())
      : true,
  );

  return (
    <>
      <Seo
        title="Learners & results"
        description="Progress and scores across your courses."
        path="/company/learners"
        noIndex
      />

      <div className="px-4 py-6 sm:px-6 sm:py-8">
        <header className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="font-display text-2xl font-extrabold tracking-tight sm:text-3xl">
              Learners & results
            </h1>
            <p className="mt-2 text-ink-600">
              Every enrolment across your courses, with progress and best assessment score.
            </p>
          </div>
          <Button
            variant="secondary"
            onClick={() => download(filtered)}
            disabled={filtered.length === 0}
          >
            <Download className="size-4" aria-hidden="true" />
            Export CSV
          </Button>
        </header>

        <Card className="mt-6">
          <CardHeader
            title={filtered.length + ' enrolment' + (filtered.length === 1 ? '' : 's')}
            action={
              <div className="flex flex-wrap gap-2">
                <div>
                  <label htmlFor="learner-course" className="sr-only">
                    Filter by course
                  </label>
                  <select
                    id="learner-course"
                    value={course}
                    onChange={(e) => setCourse(e.target.value)}
                    className="rounded-lg border-0 bg-surface py-2 pl-3 pr-8 text-sm ring-1 ring-inset ring-ink-200 focus:ring-2 focus:ring-inset focus:ring-brand-500"
                  >
                    <option value="">All courses</option>
                    {courses.data?.map((item) => (
                      <option key={item.id} value={item.slug}>
                        {item.title}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="relative">
                  <label htmlFor="learner-search" className="sr-only">
                    Search learners
                  </label>
                  <Search
                    className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-ink-400"
                    aria-hidden="true"
                  />
                  <input
                    id="learner-search"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Name or email"
                    className="w-44 rounded-lg border-0 bg-surface py-2 pl-9 pr-3 text-sm ring-1 ring-inset ring-ink-200 focus:ring-2 focus:ring-inset focus:ring-brand-500"
                  />
                </div>
              </div>
            }
          />

          {isPending ? (
            <div className="space-y-2 p-5">
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="p-5">
              <EmptyState
                icon={<Users className="size-6" />}
                title="No learners yet"
                description="Enrolments will appear here once learners join your courses."
              />
            </div>
          ) : (
            <TableScroll label="Learner enrolments">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-ink-200 bg-ink-50">
                  <tr>
                    <th scope="col" className="px-5 py-3 font-semibold text-ink-600">
                      Learner
                    </th>
                    <th scope="col" className="hidden px-5 py-3 font-semibold text-ink-600 md:table-cell">
                      Course
                    </th>
                    <th scope="col" className="px-5 py-3 font-semibold text-ink-600">
                      Progress
                    </th>
                    <th scope="col" className="px-5 py-3 font-semibold text-ink-600">
                      Score
                    </th>
                    <th scope="col" className="px-5 py-3 font-semibold text-ink-600">
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-ink-200">
                  {filtered.map((row) => (
                    <tr key={row.userId + row.courseSlug} className="transition hover:bg-ink-50">
                      <td className="px-5 py-3">
                        <span className="block font-medium text-ink-900">{row.fullName}</span>
                        <span className="block text-xs text-ink-500">{row.email}</span>
                      </td>
                      <td className="hidden px-5 py-3 text-ink-600 md:table-cell">
                        {row.courseTitle}
                      </td>
                      <td className="px-5 py-3">
                        <ProgressBar
                          value={row.progressPercent}
                          className="w-28"
                          tone={row.status === 'COMPLETED' ? 'valid' : 'brand'}
                          showLabel
                        />
                      </td>
                      <td className="px-5 py-3 font-medium text-ink-900">
                        {row.bestScore === null ? (
                          <span className="text-ink-400">—</span>
                        ) : (
                          row.bestScore + '%'
                        )}
                      </td>
                      <td className="px-5 py-3">
                        {row.status === 'COMPLETED' ? (
                          <Badge tone="valid">Completed</Badge>
                        ) : row.status === 'DROPPED' ? (
                          <Badge tone="danger">Dropped</Badge>
                        ) : (
                          <Badge tone="brand">In progress</Badge>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </TableScroll>
          )}
        </Card>
      </div>
    </>
  );
}
