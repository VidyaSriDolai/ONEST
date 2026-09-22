import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  ArrowRight,
  Award,
  ClipboardList,
  Lock,
  PlayCircle,
  Target,
} from 'lucide-react';
import { Seo } from '@/components/seo/Seo';
import { Button } from '@/components/ui/Button';
import {
  Card,
  CardHeader,
  EmptyState,
  ProgressBar,
  Skeleton,
} from '@/components/ui/primitives';
import { ApiError } from '@/lib/api-client';
import { studentApi } from './student-api';

function PageShell({
  title,
  description,
  path,
  children,
}: {
  title: string;
  description: string;
  path: string;
  children: React.ReactNode;
}) {
  return (
    <>
      <Seo title={title} description={description} path={path} noIndex />
      {/* sr-only because the topbar already shows the title; this keeps
          exactly one h1 per page for the heading outline. */}
      <h1 className="sr-only">{title}</h1>
      <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6 sm:py-8">{children}</div>
    </>
  );
}

/** Empty/skeleton/error wrapper for the three hub pages. */
function QueryState({
  isPending,
  error,
  emptyTitle,
  emptyDescription,
  emptyAction,
  skeleton,
  children,
}: {
  isPending: boolean;
  error: unknown;
  emptyTitle: string;
  emptyDescription: string;
  emptyAction?: React.ReactNode;
  skeleton: React.ReactNode;
  children: React.ReactNode;
}) {
  if (isPending) return <>{skeleton}</>;
  if (
    error instanceof ApiError &&
    (error.code === 'NOT_FOUND' || error.status === 404)
  ) {
    return (
      <Card>
        <EmptyState
          icon={<ClipboardList className="size-6" />}
          title={emptyTitle}
          description={emptyDescription}
          action={emptyAction}
        />
      </Card>
    );
  }
  if (error) {
    return (
      <Card>
        <EmptyState
          icon={<ClipboardList className="size-6" />}
          title="Something went wrong"
          description="Reload the page to try again."
        />
      </Card>
    );
  }
  return <>{children}</>;
}

/** Template nav: "Continue learning" — every active enrolment. */
export default function ContinueLearningPage() {
  const { data, isPending, error } = useQuery({
    queryKey: ['student', 'dashboard'],
    queryFn: studentApi.dashboard,
  });

  return (
    <PageShell
      title="Continue learning"
      description="Your active courses and the next module in each."
      path="/student/learn"
    >
      <QueryState
        isPending={isPending}
        error={error}
        emptyTitle="Nothing in progress"
        emptyDescription="Enrol in a course to start building towards a certification."
        emptyAction={
          <Link to="/student/courses">
            <Button>Browse courses</Button>
          </Link>
        }
        skeleton={
          <div className="space-y-4">
            <Skeleton className="h-20 w-full rounded-xl" />
            <Skeleton className="h-20 w-full rounded-xl" />
            <Skeleton className="h-20 w-full rounded-xl" />
          </div>
        }
      >
        {data && data.continueLearning.length > 0 ? (
          <ul className="space-y-4">
            {data.continueLearning.map((item) => (
              <li key={item.courseSlug}>
                <Card>
                  <div className="flex flex-wrap items-start justify-between gap-3 p-5">
                    <div className="min-w-0 flex-1">
                      <h2 className="font-semibold text-ink-900">{item.courseTitle}</h2>
                      {item.nextModuleTitle && (
                        <p className="mt-1 flex items-center gap-1.5 text-sm text-ink-600">
                          <PlayCircle className="size-4 shrink-0" aria-hidden="true" />
                          Next: {item.nextModuleTitle}
                        </p>
                      )}
                      <ProgressBar
                        value={item.progressPercent}
                        className="mt-3 max-w-md"
                        showLabel
                        label={item.courseTitle + ' progress'}
                      />
                    </div>
                    <Link to={'/student/learn/' + item.courseSlug}>
                      <Button size="sm">
                        Resume
                        <ArrowRight className="size-4" aria-hidden="true" />
                      </Button>
                    </Link>
                  </div>
                </Card>
              </li>
            ))}
          </ul>
        ) : (
          <Card>
            <EmptyState
              icon={<PlayCircle className="size-6" />}
              title="Nothing in progress"
              description="Enrol in a course to start building towards a certification."
              action={
                <Link to="/student/courses">
                  <Button>Browse courses</Button>
                </Link>
              }
            />
          </Card>
        )}
      </QueryState>
    </PageShell>
  );
}

/** Template nav: "Assessment" — every enrolment's assessment and its state. */
export function AssessmentHubPage() {
  const { data, isPending, error } = useQuery({
    queryKey: ['student', 'dashboard'],
    queryFn: studentApi.dashboard,
  });

  return (
    <PageShell
      title="Assessment"
      description="Timed assessments for the courses you are enrolled in."
      path="/student/assessment"
    >
      <QueryState
        isPending={isPending}
        error={error}
        emptyTitle="No assessments yet"
        emptyDescription="Assessments appear once you enrol in a course that has one."
        emptyAction={
          <Link to="/student/courses">
            <Button>Browse courses</Button>
          </Link>
        }
        skeleton={
          <div className="space-y-4">
            <Skeleton className="h-24 w-full rounded-xl" />
            <Skeleton className="h-24 w-full rounded-xl" />
          </div>
        }
      >
        {data && data.continueLearning.length > 0 ? (
          <Card>
            <CardHeader
              title="How assessments work"
              description="Each course has one timed assessment. Finish every module to unlock it; pass it to clear the course's certification requirement."
            />
            <ul className="divide-y divide-ink-200 p-2">
              {data.continueLearning.map((item) => (
                <li
                  key={item.courseSlug}
                  className="flex flex-wrap items-center justify-between gap-3 p-4"
                >
                  <div className="min-w-0">
                    <h3 className="font-semibold text-ink-900">{item.courseTitle}</h3>
                    <p className="mt-0.5 flex items-center gap-1.5 text-sm text-ink-600">
                      <Target className="size-3.5 shrink-0" aria-hidden="true" />
                      {item.progressPercent >= 100
                        ? 'Unlocked — ready when you are.'
                        : item.progressPercent +
                          '% of modules done. The assessment unlocks at 100%.'}
                    </p>
                  </div>
                  {item.progressPercent >= 100 ? (
                    <Link to={'/student/learn/' + item.courseSlug}>
                      <Button size="sm">
                        <ClipboardList className="size-4" aria-hidden="true" />
                        Open assessment
                      </Button>
                    </Link>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-ink-100 px-3 py-1.5 text-xs font-semibold text-ink-500">
                      <Lock className="size-3.5" aria-hidden="true" />
                      Locked
                    </span>
                  )}
                </li>
              ))}
            </ul>
          </Card>
        ) : (
          <Card>
            <EmptyState
              icon={<ClipboardList className="size-6" />}
              title="No assessments yet"
              description="Assessments appear once you enrol in a course that has one."
              action={
                <Link to="/student/courses">
                  <Button>Browse courses</Button>
                </Link>
              }
            />
          </Card>
        )}
      </QueryState>
    </PageShell>
  );
}

/** Template nav: "Latest result" — the most recent submitted attempt. */
export function LatestResultPage() {
  const { data, isPending, error } = useQuery({
    queryKey: ['student', 'latest-result'],
    queryFn: studentApi.latestResult,
    retry: false,
  });

  return (
    <PageShell
      title="Latest result"
      description="How you did on your most recent assessment attempt."
      path="/student/result"
    >
      <QueryState
        isPending={isPending}
        error={error}
        emptyTitle="No results yet"
        emptyDescription="Take an assessment and your score will appear here."
        emptyAction={
          <Link to="/student/assessment">
            <Button>Go to assessments</Button>
          </Link>
        }
        skeleton={<Skeleton className="h-48 w-full rounded-2xl" />}
      >
        {data && (
          <Card>
            <div className="flex flex-wrap items-center justify-between gap-5 p-6">
              <div>
                <p className="text-sm font-medium text-ink-600">{data.courseTitle}</p>
                <p className="mt-1 font-display text-4xl font-extrabold text-ink-900">
                  {data.score}
                  <span className="text-xl text-ink-500">%</span>
                </p>
                <p
                  className={
                    'mt-1 text-sm font-semibold ' +
                    (data.passed ? 'text-valid-700' : 'text-danger-700')
                  }
                >
                  {data.passed ? 'Passed' : 'Not passed'} — pass mark {data.passingScore}%
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Link to={'/student/result/' + data.attemptId}>
                  <Button variant="secondary" size="sm">
                    Full review
                  </Button>
                </Link>
                {data.canRetake && (
                  <Link to={'/student/learn/' + data.courseSlug}>
                    <Button size="sm">Retake from the course</Button>
                  </Link>
                )}
              </div>
            </div>
            <div className="border-t border-ink-200 px-6 py-4">
              <p className="text-sm text-ink-600">
                {data.correctCount} of {data.totalQuestions} questions correct
                {data.autoSubmitted ? ' — submitted automatically when time ran out.' : '.'}
              </p>
            </div>
          </Card>
        )}
      </QueryState>
    </PageShell>
  );
}

/** Template nav: "Certificate" — the learner's earned credentials. */
export function CertificateHubPage() {
  const { data, isPending, error } = useQuery({
    queryKey: ['student', 'certificates'],
    queryFn: studentApi.certificates,
  });

  const first = data?.[0];

  return (
    <PageShell
      title="Certificate"
      description="Your earned certificates and their QR codes."
      path="/student/certificate"
    >
      <QueryState
        isPending={isPending}
        error={error}
        emptyTitle="No certificates yet"
        emptyDescription="Complete a certification track's courses and pass its assessments."
        emptyAction={
          <Link to="/student/certifications">
            <Button>See track requirements</Button>
          </Link>
        }
        skeleton={<Skeleton className="h-40 w-full rounded-2xl" />}
      >
        {first ? (
          <Card>
            <div className="flex flex-wrap items-center justify-between gap-4 p-6">
              <div className="flex items-center gap-4">
                <span className="flex size-12 items-center justify-center rounded-2xl bg-accent-50 text-accent-600">
                  <Award className="size-6" aria-hidden="true" />
                </span>
                <div>
                  <h2 className="font-display text-lg font-bold text-ink-900">
                    {first.trackName}
                  </h2>
                  <p className="text-sm text-ink-500">
                    {first.certificateId}
                    {' · '}
                    {data && data.length > 1
                      ? data.length + ' certificates earned'
                      : 'Issued ' + new Date(first.issuedAt).toLocaleDateString()}
                  </p>
                </div>
              </div>
              <Link to={'/student/certificates/' + first.certificateId}>
                <Button size="sm">
                  View certificate
                  <ArrowRight className="size-4" aria-hidden="true" />
                </Button>
              </Link>
            </div>
            {data && data.length > 1 && (
              <ul className="border-t border-ink-200 p-2">
                {data.map((cert) => (
                  <li key={cert.id}>
                    <Link
                      to={'/student/certificates/' + cert.certificateId}
                      className="flex items-center justify-between gap-3 rounded-xl p-3 text-sm hover:bg-ink-50"
                    >
                      <span className="font-medium text-ink-900">{cert.trackName}</span>
                      <span className="font-mono text-xs text-ink-500">
                        {cert.certificateId}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        ) : null}
      </QueryState>
    </PageShell>
  );
}
