import { Link, useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  BookOpen,
  CheckCircle2,
  Clock,
  Loader2,
  Lock,
  Sparkles,
  Star,
} from 'lucide-react';
import { Seo } from '@/components/seo/Seo';
import { Alert } from '@/components/ui/Alert';
import { Button } from '@/components/ui/Button';
import { Badge, Card, CardHeader, ProgressBar } from '@/components/ui/primitives';
import { ApiError } from '@/lib/api-client';
import { useToast } from '@/components/ui/Toast';
import { studentApi, type CourseDetail } from './student-api';

export default function CourseDetailPage() {
  const { slug = '' } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data, isPending, isError, error } = useQuery<CourseDetail>({
    queryKey: ['course', slug],
    queryFn: () => studentApi.course(slug),
    enabled: Boolean(slug),
    retry: false,
  });

  const enroll = useMutation({
    mutationFn: () => studentApi.enroll(slug),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['course', slug] });
      void queryClient.invalidateQueries({ queryKey: ['student'] });
      toast({
        tone: 'success',
        title: 'Enrolled',
        description: data ? 'You are enrolled in ' + data.title + '.' : undefined,
      });
      navigate('/student/learn/' + slug);
    },
  });

  if (isPending) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Loader2 className="size-6 animate-spin text-ink-400" aria-hidden="true" />
        <span className="sr-only">Loading course…</span>
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="px-4 py-8 sm:px-6">
        <Alert tone="error" title="We could not load that course">
          {error instanceof ApiError ? error.message : 'Please try again in a moment.'}
        </Alert>
        <Link to="/student/courses" className="mt-5 inline-block">
          <Button variant="secondary">
            <ArrowLeft className="size-4" aria-hidden="true" />
            Back to catalogue
          </Button>
        </Link>
      </div>
    );
  }

  const unmet = data.prerequisites.filter((p) => !p.met);

  return (
    <>
      <Seo title={data.title} description={data.description} path={'/student/courses/' + slug} noIndex />

      <div className="px-4 py-6 sm:px-6 sm:py-8">
        <Link
          to="/student/courses"
          className="inline-flex items-center gap-1.5 rounded text-sm font-medium text-ink-500 transition hover:text-ink-900"
        >
          <ArrowLeft className="size-4" aria-hidden="true" />
          Back to catalogue
        </Link>

        <div className="mt-4 grid gap-6 lg:grid-cols-3">
          {/* Main ---------------------------------------------------------- */}
          <div className="lg:col-span-2">
            <div className="flex flex-wrap items-center gap-2">
              <Badge tone="neutral">{data.category}</Badge>
              <Badge tone="brand">
                {data.level.charAt(0) + data.level.slice(1).toLowerCase()}
              </Badge>
            </div>

            <h1 className="mt-3 font-display text-2xl font-extrabold tracking-tight sm:text-3xl">
              {data.title}
            </h1>
            <p className="mt-3 text-lg leading-relaxed text-ink-600">{data.description}</p>

            <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-ink-500">
              <span className="inline-flex items-center gap-1.5">
                <Clock className="size-4" aria-hidden="true" />
                {data.durationHours} hours
              </span>
              <span className="inline-flex items-center gap-1.5">
                <BookOpen className="size-4" aria-hidden="true" />
                {data.moduleCount} modules
              </span>
              {data.rating !== null && (
                <span className="inline-flex items-center gap-1.5">
                  <Star className="size-4 fill-accent-400 text-accent-400" aria-hidden="true" />
                  {data.rating.toFixed(1)}
                </span>
              )}
              <span>by {data.providerName}</span>
            </div>

            {/* Prerequisites -------------------------------------------------- */}
            {data.prerequisites.length > 0 && (
              <div className="mt-6">
                {unmet.length > 0 ? (
                  <Alert tone="warning" title="Prerequisites not met">
                    Complete {unmet.map((p) => p.title).join(', ')} first.
                  </Alert>
                ) : (
                  <Alert tone="success" title="Prerequisites met">
                    You have completed everything this course requires.
                  </Alert>
                )}

                <ul className="mt-3 space-y-2">
                  {data.prerequisites.map((prerequisite) => (
                    <li key={prerequisite.id}>
                      <Link
                        to={'/student/courses/' + prerequisite.slug}
                        className="flex items-center gap-2.5 rounded-xl bg-surface px-4 py-3 text-sm ring-1 ring-ink-200 transition hover:ring-brand-200"
                      >
                        {prerequisite.met ? (
                          <CheckCircle2
                            className="size-4.5 shrink-0 text-valid-600"
                            aria-hidden="true"
                          />
                        ) : (
                          <Lock className="size-4.5 shrink-0 text-accent-600" aria-hidden="true" />
                        )}
                        <span className="flex-1 font-medium text-ink-800">
                          {prerequisite.title}
                        </span>
                        <span className="text-xs text-ink-500">
                          {prerequisite.met ? 'Completed' : 'Required'}
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Modules -------------------------------------------------------- */}
            <Card className="mt-6">
              <CardHeader title="What you will cover" description={data.moduleCount + ' modules'} />
              <ol className="divide-y divide-ink-200">
                {data.modules.map((module, index) => (
                  <li key={module.id} className="flex items-center gap-3 px-5 py-3.5">
                    <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-ink-100 text-xs font-bold text-ink-600">
                      {index + 1}
                    </span>
                    <span className="min-w-0 flex-1 text-sm font-medium text-ink-800">
                      {module.title}
                    </span>
                    <span className="shrink-0 text-xs text-ink-500">
                      {module.durationMinutes} min
                    </span>
                  </li>
                ))}
              </ol>
            </Card>
          </div>

          {/* Sidebar -------------------------------------------------------- */}
          <div>
            <Card className="sticky top-24 p-5">
              {data.enrollment ? (
                <>
                  <p className="text-sm font-semibold text-ink-900">
                    {data.enrollment.status === 'COMPLETED' ? 'Completed' : 'In progress'}
                  </p>
                  <ProgressBar
                    value={data.enrollment.progressPercent}
                    className="mt-3"
                    tone={data.enrollment.status === 'COMPLETED' ? 'valid' : 'brand'}
                    showLabel
                  />
                  <Link to={'/student/learn/' + slug} className="mt-4 block">
                    <Button fullWidth size="lg">
                      {data.enrollment.progressPercent > 0 ? 'Resume course' : 'Start course'}
                      <ArrowRight className="size-4" aria-hidden="true" />
                    </Button>
                  </Link>
                </>
              ) : (
                <>
                  <p className="text-sm text-ink-600">
                    Enrol to unlock the modules and the final assessment.
                  </p>

                  {enroll.isError && (
                    <Alert tone="error" className="mt-3">
                      {enroll.error instanceof ApiError
                        ? enroll.error.message
                        : 'Could not enrol. Please try again.'}
                    </Alert>
                  )}

                  <Button
                    fullWidth
                    size="lg"
                    className="mt-4"
                    disabled={!data.canEnroll}
                    isLoading={enroll.isPending}
                    loadingText="Enrolling…"
                    onClick={() => enroll.mutate()}
                  >
                    {data.canEnroll ? 'Enrol now' : 'Prerequisites required'}
                  </Button>

                  {!data.canEnroll && (
                    <p className="mt-2 flex items-start gap-1.5 text-xs text-accent-700">
                      <AlertTriangle className="mt-px size-3.5 shrink-0" aria-hidden="true" />
                      Complete {unmet.map((p) => p.title).join(', ')} first.
                    </p>
                  )}
                </>
              )}

              {data.skills.length > 0 && (
                <div className="mt-6 border-t border-ink-200 pt-5">
                  <h2 className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-ink-500">
                    <Sparkles className="size-3.5" aria-hidden="true" />
                    Skills you will gain
                  </h2>
                  <ul className="mt-3 flex flex-wrap gap-2">
                    {data.skills.map((skill) => (
                      <li
                        key={skill}
                        className="rounded-full bg-brand-50 px-2.5 py-1 text-xs font-medium text-brand-700"
                      >
                        {skill}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {data.assessment && (
                <div className="mt-6 border-t border-ink-200 pt-5">
                  <h2 className="text-xs font-semibold uppercase tracking-wider text-ink-500">
                    Final assessment
                  </h2>
                  <p className="mt-2 text-sm text-ink-700">{data.assessment.title}</p>
                  <p className="mt-1 text-xs text-ink-500">
                    Pass mark {data.assessment.passingScore}% · up to{' '}
                    {data.assessment.maxAttempts} attempts
                  </p>
                </div>
              )}
            </Card>
          </div>
        </div>
      </div>
    </>
  );
}
