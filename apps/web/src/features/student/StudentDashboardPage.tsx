import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  ArrowRight,
  Award,
  BadgeCheck,
  BookOpen,
  CheckCircle2,
  Library,
  Sparkles,
} from 'lucide-react';
import { Seo } from '@/components/seo/Seo';
import { Button } from '@/components/ui/Button';
import {
  Card,
  CardHeader,
  EmptyState,
  ProgressBar,
  ProgressRing,
  Skeleton,
  StatCard,
} from '@/components/ui/primitives';
import { useAuth } from '@/features/auth/AuthProvider';
import { studentApi, type StudentDashboard } from './student-api';
import { NotificationList } from './NotificationList';

export default function StudentDashboardPage() {
  const { user } = useAuth();
  const { data, isPending } = useQuery<StudentDashboard>({
    queryKey: ['student', 'dashboard'],
    queryFn: studentApi.dashboard,
  });

  const firstName = user?.fullName.split(' ')[0] ?? 'there';

  return (
    <>
      <Seo
        title="Dashboard"
        description="Your learning progress at a glance."
        path="/student/dashboard"
        noIndex
      />

      <div className="px-4 py-6 sm:px-6 sm:py-8">
        {/* Welcome banner ------------------------------------------------- */}
        <section className="relative overflow-hidden rounded-2xl bg-brand-700 px-6 py-7 text-white sm:px-8">
          <div aria-hidden="true" className="pointer-events-none absolute inset-0">
            <div className="absolute -right-16 -top-20 size-64 rounded-full bg-brand-500/40 blur-3xl" />
            <div className="absolute -bottom-24 left-1/3 size-56 rounded-full bg-brand-400/25 blur-3xl" />
          </div>
          <div className="relative flex flex-wrap items-center justify-between gap-5">
            <div>
              <h1 className="font-display text-2xl font-extrabold sm:text-3xl">
                Welcome back, {firstName}
              </h1>
              <p className="mt-1.5 max-w-lg text-brand-100">
                {data?.nearestTrack
                  ? 'You are ' +
                    data.nearestTrack.percentComplete +
                    '% of the way to ' +
                    data.nearestTrack.name +
                    '.'
                  : 'Pick up where you left off, or browse the catalogue for something new.'}
              </p>
            </div>
            {data?.nearestTrack && (
              <Link to="/student/certifications">
                <Button className="bg-surface text-brand-700 shadow-none hover:bg-brand-50">
                  View progress
                  <ArrowRight className="size-4" aria-hidden="true" />
                </Button>
              </Link>
            )}
          </div>
        </section>

        {/* Stats ------------------------------------------------------------ */}
        <section className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4" aria-label="Your totals">
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
                label="Courses enrolled"
                value={data.stats.enrolled}
                icon={<Library className="size-5" />}
              />
              <StatCard
                label="Courses completed"
                value={data.stats.completed}
                tone="valid"
                icon={<CheckCircle2 className="size-5" />}
              />
              <StatCard
                label="Certificates earned"
                value={data.stats.certificates}
                tone="accent"
                icon={<BadgeCheck className="size-5" />}
              />
              <StatCard
                label="Skills validated"
                value={data.stats.skills}
                icon={<Sparkles className="size-5" />}
              />
            </>
          )}
        </section>

        <div className="mt-6 grid gap-6 lg:grid-cols-3">
          {/* Continue learning --------------------------------------------- */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader
                title="Continue learning"
                description="Pick up where you left off."
                action={
                  <Link to="/student/courses">
                    <Button variant="ghost" size="sm">
                      Browse catalogue
                    </Button>
                  </Link>
                }
              />
              <div className="p-5">
                {isPending ? (
                  <div className="space-y-4">
                    <Skeleton className="h-16 w-full" />
                    <Skeleton className="h-16 w-full" />
                  </div>
                ) : data && data.continueLearning.length > 0 ? (
                  <ul className="space-y-4">
                    {data.continueLearning.map((item) => (
                      <li
                        key={item.courseSlug}
                        className="rounded-xl bg-ink-50 p-4 ring-1 ring-inset ring-ink-200"
                      >
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div className="min-w-0">
                            <h3 className="font-semibold text-ink-900">{item.courseTitle}</h3>
                            {item.nextModuleTitle && (
                              <p className="mt-0.5 flex items-center gap-1.5 text-sm text-ink-600">
                                <BookOpen className="size-3.5 shrink-0" aria-hidden="true" />
                                Next: {item.nextModuleTitle}
                              </p>
                            )}
                          </div>
                          <Link to={'/student/learn/' + item.courseSlug}>
                            <Button size="sm">Resume</Button>
                          </Link>
                        </div>
                        <ProgressBar
                          value={item.progressPercent}
                          className="mt-3"
                          showLabel
                          label={item.courseTitle + " progress"}
                        />
                      </li>
                    ))}
                  </ul>
                ) : (
                  <EmptyState
                    icon={<Library className="size-6" />}
                    title="Nothing in progress"
                    description="Enrol in a course to start building towards a certification."
                    action={
                      <Link to="/student/courses">
                        <Button>Browse courses</Button>
                      </Link>
                    }
                  />
                )}
              </div>
            </Card>
          </div>

          {/* Track progress ring + earned skills ----------------------------- */}
          <div className="space-y-6">
            <Card>
              <CardHeader title="Nearest certification" />
              <div className="flex flex-col items-center p-5">
                {isPending ? (
                  <Skeleton className="size-32 rounded-full" />
                ) : data?.nearestTrack ? (
                  <>
                    <ProgressRing
                      value={data.nearestTrack.percentComplete}
                      sublabel="complete"
                      size={132}
                    />
                    <p className="mt-4 text-center font-semibold text-ink-900">
                      {data.nearestTrack.name}
                    </p>
                    <p className="mt-1 text-center text-sm text-ink-600">
                      {data.nearestTrack.coursesRemaining} course
                      {data.nearestTrack.coursesRemaining === 1 ? '' : 's'} to go
                    </p>
                    <Link to="/student/certifications" className="mt-4 w-full">
                      <Button variant="secondary" fullWidth size="sm">
                        <Award className="size-4" aria-hidden="true" />
                        See requirements
                      </Button>
                    </Link>
                  </>
                ) : (
                  <p className="py-8 text-center text-sm text-ink-500">
                    Enrol in a track's courses to start making progress.
                  </p>
                )}
              </div>
            </Card>

            {/* Every distinct skill across the certificates earned. */}
            <Card>
              <CardHeader title="Skills you have earned" />
              <div className="p-5">
                {isPending ? (
                  <div className="flex flex-wrap gap-2">
                    <Skeleton className="h-7 w-16 rounded-full" />
                    <Skeleton className="h-7 w-20 rounded-full" />
                    <Skeleton className="h-7 w-14 rounded-full" />
                  </div>
                ) : data && data.skillsEarned.length > 0 ? (
                  <ul className="flex flex-wrap gap-2">
                    {data.skillsEarned.map((skill) => (
                      <li
                        key={skill}
                        className="rounded-full bg-brand-50 px-3 py-1.5 text-xs font-medium text-brand-700 ring-1 ring-inset ring-brand-100"
                      >
                        {skill}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-ink-500">
                    Skills appear here once you earn your first certificate.
                  </p>
                )}
              </div>
            </Card>
          </div>
        </div>

        {/* Notifications ---------------------------------------------------- */}
        <section className="mt-6">
          <Card>
            <CardHeader
              title="Recent notifications"
              action={
                <Link to="/student/profile">
                  <Button variant="ghost" size="sm">
                    See all
                  </Button>
                </Link>
              }
            />
            <div className="p-2">
              {isPending ? (
                <div className="space-y-2 p-3">
                  <Skeleton className="h-12 w-full" />
                  <Skeleton className="h-12 w-full" />
                </div>
              ) : (
                <NotificationList notifications={data?.recentNotifications ?? []} compact />
              )}
            </div>
          </Card>
        </section>
      </div>
    </>
  );
}
