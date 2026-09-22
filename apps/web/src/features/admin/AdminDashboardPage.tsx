import { useQuery } from '@tanstack/react-query';
import { Award, BookOpen, Building2, ShieldCheck, Users } from 'lucide-react';
import { ROLE_LABEL, type Role } from '@skillseal/shared';
import { Seo } from '@/components/seo/Seo';
import { Card, CardHeader, Skeleton, StatCard } from '@/components/ui/primitives';
import { BarChart, DonutChart, LineChart } from '@/components/charts/Charts';
import { adminApi, type AdminDashboard } from './admin-api';

export default function AdminDashboardPage() {
  const { data, isPending } = useQuery<AdminDashboard>({
    queryKey: ['admin', 'dashboard'],
    queryFn: adminApi.dashboard,
  });

  return (
    <>
      <Seo
        title="Admin dashboard"
        description="Platform health at a glance."
        path="/admin/dashboard"
        noIndex
      />

      <div className="px-4 py-6 sm:px-6 sm:py-8">
        <header>
          <h1 className="font-display text-2xl font-extrabold tracking-tight sm:text-3xl">
            Platform overview
          </h1>
          <p className="mt-2 text-ink-600">
            Users, courses, credentials and verification volume across the whole network.
          </p>
        </header>

        <section className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {isPending || !data ? (
            Array.from({ length: 5 }).map((_, index) => (
              <div key={index} className="rounded-2xl bg-surface p-5 shadow-card ring-1 ring-ink-200">
                <Skeleton className="h-4 w-20" />
                <Skeleton className="mt-3 h-8 w-14" />
              </div>
            ))
          ) : (
            <>
              <StatCard label="Users" value={data.stats.users} icon={<Users className="size-5" />} />
              <StatCard
                label="Organisations"
                value={data.stats.organizations}
                icon={<Building2 className="size-5" />}
              />
              <StatCard
                label="Courses"
                value={data.stats.courses}
                icon={<BookOpen className="size-5" />}
              />
              <StatCard
                label="Certificates"
                value={data.stats.certificates}
                tone="accent"
                icon={<Award className="size-5" />}
              />
              <StatCard
                label="Verifications"
                value={data.stats.verifications}
                tone="valid"
                icon={<ShieldCheck className="size-5" />}
              />
            </>
          )}
        </section>

        <div className="mt-6 grid gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader title="Verifications per day" description="Last 14 days" />
            <div className="p-5">
              {isPending || !data ? (
                <Skeleton className="h-44 w-full" />
              ) : (
                <LineChart
                  data={data.verificationsPerDay.map((p) => ({ label: p.day, value: p.count }))}
                  caption="Verification checks per day over the last fortnight"
                />
              )}
            </div>
          </Card>

          <Card>
            <CardHeader title="Certificates per month" description="Last six months" />
            <div className="p-5">
              {isPending || !data ? (
                <Skeleton className="h-44 w-full" />
              ) : (
                <BarChart
                  tone="accent"
                  data={data.certificatesPerMonth.map((p) => ({ label: p.month, value: p.count }))}
                  caption="Certificates issued per month"
                />
              )}
            </div>
          </Card>

          <Card>
            <CardHeader title="Users by role" />
            <div className="p-5">
              {isPending || !data ? (
                <Skeleton className="h-40 w-full" />
              ) : (
                <DonutChart
                  data={data.usersByRole.map((p) => ({
                    label: ROLE_LABEL[p.role as Role] ?? p.role,
                    value: p.count,
                  }))}
                  caption="Accounts by role"
                />
              )}
            </div>
          </Card>

          <Card>
            <CardHeader title="ONEST publication" description="Certificate sync status" />
            <div className="p-5">
              {isPending || !data ? (
                <Skeleton className="h-40 w-full" />
              ) : (
                <DonutChart
                  data={data.onestSummary.map((p) => ({
                    label: p.status.charAt(0) + p.status.slice(1).toLowerCase(),
                    value: p.count,
                  }))}
                  caption="Certificates by ONEST publication status"
                />
              )}
            </div>
          </Card>
        </div>
      </div>
    </>
  );
}
