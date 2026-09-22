import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { BadgeCheck, BookOpen, Library, TrendingUp, Users } from 'lucide-react';
import { Seo } from '@/components/seo/Seo';
import { Button } from '@/components/ui/Button';
import { TableScroll } from '@/components/ui/TableScroll';
import { Card, CardHeader, Skeleton, StatCard } from '@/components/ui/primitives';
import { BarChart, LineChart } from '@/components/charts/Charts';
import { providerApi, type ProviderDashboard } from './provider-api';

export default function ProviderDashboardPage() {
  const { data, isPending } = useQuery<ProviderDashboard>({
    queryKey: ['provider', 'dashboard'],
    queryFn: providerApi.dashboard,
  });

  return (
    <>
      <Seo
        title="Provider dashboard"
        description="How your courses and learners are performing."
        path="/company/dashboard"
        noIndex
      />

      <div className="px-4 py-6 sm:px-6 sm:py-8">
        <header className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="font-display text-2xl font-extrabold tracking-tight sm:text-3xl">
              Provider dashboard
            </h1>
            <p className="mt-2 text-ink-600">
              How your programme is performing across every course.
            </p>
          </div>
          <Link to="/company/courses">
            <Button>
              <Library className="size-4" aria-hidden="true" />
              Manage courses
            </Button>
          </Link>
        </header>

        {/* Stats ------------------------------------------------------------ */}
        <section className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {isPending || !data ? (
            Array.from({ length: 4 }).map((_, index) => (
              <div key={index} className="rounded-2xl bg-surface p-5 shadow-card ring-1 ring-ink-200">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="mt-3 h-8 w-16" />
              </div>
            ))
          ) : (
            <>
              <StatCard
                label="Courses"
                value={data.stats.courses}
                hint={data.stats.publishedCourses + ' published'}
                icon={<BookOpen className="size-5" />}
              />
              <StatCard
                label="Learners"
                value={data.stats.learners}
                icon={<Users className="size-5" />}
              />
              <StatCard
                label="Completion rate"
                value={data.stats.completionRate}
                suffix="%"
                tone="valid"
                icon={<TrendingUp className="size-5" />}
              />
              <StatCard
                label="Certificates issued"
                value={data.stats.certificatesIssued}
                tone="accent"
                icon={<BadgeCheck className="size-5" />}
              />
            </>
          )}
        </section>

        {/* Charts ------------------------------------------------------------ */}
        <div className="mt-6 grid gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader title="Enrolments over time" description="Last six months" />
            <div className="p-5">
              {isPending || !data ? (
                <Skeleton className="h-44 w-full" />
              ) : (
                <LineChart
                  data={data.enrollmentsOverTime.map((point) => ({
                    label: point.month,
                    value: point.count,
                  }))}
                  caption="Enrolments per month over the last six months"
                />
              )}
            </div>
          </Card>

          <Card>
            <CardHeader title="Completions by course" description="Learners who finished" />
            <div className="p-5">
              {isPending || !data ? (
                <Skeleton className="h-44 w-full" />
              ) : (
                <BarChart
                  tone="valid"
                  data={data.completionByCourse.map((point) => ({
                    // Keep the axis readable on narrow screens.
                    label: point.course.split(' ')[0] ?? point.course,
                    value: point.completed,
                  }))}
                  caption="Completed enrolments per course"
                />
              )}
            </div>
          </Card>
        </div>

        {/* Course breakdown --------------------------------------------------- */}
        <Card className="mt-6">
          <CardHeader
            title="Course breakdown"
            action={
              <Link to="/company/learners">
                <Button variant="ghost" size="sm">
                  View learners
                </Button>
              </Link>
            }
          />
          <TableScroll label="Course breakdown">
            {isPending || !data ? (
              <div className="space-y-2 p-5">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
              </div>
            ) : (
              <table className="w-full text-left text-sm">
                <thead className="border-b border-ink-200 bg-ink-50">
                  <tr>
                    <th scope="col" className="px-5 py-3 font-semibold text-ink-600">
                      Course
                    </th>
                    <th scope="col" className="px-5 py-3 font-semibold text-ink-600">
                      Enrolled
                    </th>
                    <th scope="col" className="px-5 py-3 font-semibold text-ink-600">
                      Completed
                    </th>
                    <th scope="col" className="px-5 py-3 font-semibold text-ink-600">
                      Rate
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-ink-200">
                  {data.completionByCourse.map((row) => (
                    <tr key={row.course} className="transition hover:bg-ink-50">
                      <td className="px-5 py-3 font-medium text-ink-900">{row.course}</td>
                      <td className="px-5 py-3 text-ink-600">{row.enrolled}</td>
                      <td className="px-5 py-3 text-ink-600">{row.completed}</td>
                      <td className="px-5 py-3 font-semibold text-ink-900">
                        {row.enrolled === 0
                          ? '—'
                          : Math.round((row.completed / row.enrolled) * 100) + '%'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </TableScroll>
        </Card>
      </div>
    </>
  );
}
