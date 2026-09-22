import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft,
  ArrowRight,
  Check,
  CheckCircle2,
  ClipboardCheck,
  Loader2,
  Lock,
  Menu,
  PlayCircle,
} from 'lucide-react';
import { Seo } from '@/components/seo/Seo';
import { Alert } from '@/components/ui/Alert';
import { Button } from '@/components/ui/Button';
import { ApiError } from '@/lib/api-client';
import { cn } from '@/lib/cn';
import { studentApi, type LearningView } from './student-api';

export default function LearnPage() {
  const { slug = '' } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [activeIndex, setActiveIndex] = useState(0);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const { data, isPending, isError, error } = useQuery<LearningView>({
    queryKey: ['learn', slug],
    queryFn: () => studentApi.learn(slug),
    enabled: Boolean(slug),
    retry: false,
  });

  // Open on the first unfinished module rather than always module one.
  useEffect(() => {
    if (!data) return;
    const firstIncomplete = data.modules.findIndex((m) => !m.completed);
    setActiveIndex(firstIncomplete === -1 ? 0 : firstIncomplete);
  }, [data?.course.id]);

  const complete = useMutation({
    mutationFn: (moduleId: string) => studentApi.completeModule(slug, moduleId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['learn', slug] });
      void queryClient.invalidateQueries({ queryKey: ['student'] });
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
        <Alert tone="error" title="We could not open that course">
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

  const active = data.modules[activeIndex];
  const completedCount = data.modules.filter((m) => m.completed).length;
  const progress =
    data.modules.length === 0 ? 0 : Math.round((completedCount / data.modules.length) * 100);

  const moduleList = (
    <ol className="space-y-1">
      {data.modules.map((module, index) => (
        <li key={module.id}>
          <button
            type="button"
            onClick={() => {
              setActiveIndex(index);
              setDrawerOpen(false);
            }}
            className={cn(
              'flex w-full items-start gap-2.5 rounded-xl px-3 py-2.5 text-left text-sm transition',
              index === activeIndex
                ? 'bg-brand-50 font-semibold text-brand-700'
                : 'text-ink-600 hover:bg-ink-100',
            )}
            aria-current={index === activeIndex ? 'step' : undefined}
          >
            <span
              className={cn(
                'mt-px flex size-5 shrink-0 items-center justify-center rounded-full text-[10px] font-bold transition',
                module.completed
                  ? 'bg-valid-500 text-white'
                  : index === activeIndex
                    ? 'bg-brand-600 text-white'
                    : 'bg-ink-200 text-ink-600',
              )}
            >
              {module.completed ? <Check className="size-3" aria-hidden="true" /> : index + 1}
            </span>
            <span className="min-w-0 flex-1">{module.title}</span>
          </button>
        </li>
      ))}
    </ol>
  );

  return (
    <>
      <Seo title={data.course.title} description="Work through the course modules." path={'/student/learn/' + slug} noIndex />

      {/* Progress bar pinned to the top of the reading area. */}
      <div className="sticky top-16 z-30 h-1 bg-ink-200">
        <div
          className="h-full bg-brand-600 transition-[width] duration-700 ease-out"
          style={{ width: progress + '%' }}
          role="progressbar"
          aria-valuenow={progress}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label="Course progress"
        />
      </div>

      <div className="px-4 py-6 sm:px-6 sm:py-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <Link
              to={'/student/courses/' + slug}
              className="inline-flex items-center gap-1.5 rounded text-sm font-medium text-ink-500 transition hover:text-ink-900"
            >
              <ArrowLeft className="size-4" aria-hidden="true" />
              {data.course.title}
            </Link>
            <p className="mt-1 text-xs text-ink-500">
              {completedCount} of {data.modules.length} modules complete
            </p>
          </div>

          <Button
            variant="secondary"
            size="sm"
            className="lg:hidden"
            onClick={() => setDrawerOpen(true)}
          >
            <Menu className="size-4" aria-hidden="true" />
            Modules
          </Button>
        </div>

        <div className="mt-5 grid gap-6 lg:grid-cols-[16rem_1fr]">
          {/* Module list (desktop) ------------------------------------------ */}
          <aside className="hidden lg:block">
            <div className="sticky top-28 rounded-2xl bg-surface p-3 shadow-card ring-1 ring-ink-200">
              <h2 className="px-3 py-2 text-xs font-semibold uppercase tracking-wider text-ink-500">
                Modules
              </h2>
              {moduleList}

              {data.assessment && (
                <div className="mt-3 border-t border-ink-200 pt-3">
                  <Link
                    to={data.assessment.unlocked ? '/student/assessment/' + data.assessment.id : '#'}
                    onClick={(event) => !data.assessment?.unlocked && event.preventDefault()}
                    className={cn(
                      'flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-medium transition',
                      data.assessment.unlocked
                        ? 'bg-accent-50 text-accent-700 hover:bg-accent-100'
                        : 'cursor-not-allowed text-ink-400',
                    )}
                    aria-disabled={!data.assessment.unlocked}
                  >
                    {data.assessment.unlocked ? (
                      <ClipboardCheck className="size-4.5 shrink-0" aria-hidden="true" />
                    ) : (
                      <Lock className="size-4.5 shrink-0" aria-hidden="true" />
                    )}
                    <span className="min-w-0 flex-1">Final assessment</span>
                  </Link>
                  {!data.assessment.unlocked && (
                    <p className="px-3 pt-1.5 text-[11px] text-ink-500">
                      Finish every module to unlock.
                    </p>
                  )}
                </div>
              )}
            </div>
          </aside>

          {/* Mobile drawer -------------------------------------------------- */}
          {drawerOpen && (
            <div className="fixed inset-0 z-50 lg:hidden">
              <div
                className="absolute inset-0 bg-ink-950/60"
                onClick={() => setDrawerOpen(false)}
                aria-hidden="true"
              />
              <div className="absolute inset-y-0 left-0 w-72 max-w-[85vw] overflow-y-auto bg-surface p-4 shadow-lifted">
                <h2 className="mb-3 font-display text-base font-bold">Modules</h2>
                {moduleList}
              </div>
            </div>
          )}

          {/* Module content -------------------------------------------------- */}
          <article className="min-w-0">
            {active ? (
              <div className="rounded-2xl bg-surface p-6 shadow-card ring-1 ring-ink-200 sm:p-8">
                <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-brand-600">
                  Module {activeIndex + 1} of {data.modules.length}
                  {active.completed && (
                    <span className="inline-flex items-center gap-1 text-valid-700">
                      <CheckCircle2 className="size-3.5" aria-hidden="true" />
                      Complete
                    </span>
                  )}
                </div>

                <h1 className="mt-2 font-display text-2xl font-extrabold tracking-tight">
                  {active.title}
                </h1>
                <p className="mt-1 text-sm text-ink-500">{active.durationMinutes} minute read</p>

                {/*
                  Lesson media. There is no video pipeline yet, so this is an
                  honest placeholder rather than a broken <video> element: the
                  play affordance is inert and labelled as such, which is
                  clearer than a control that does nothing when clicked.
                */}
                {/* brand-950 rather than ink-900: the ink ramp inverts in dark mode, which would turn this media surface near-white under its white text. brand-950 is not flipped, so the area stays dark in both themes. */}
                <div className="palette-light mt-6 overflow-hidden rounded-xl bg-ink-900 ring-1 ring-ink-200">
                  <div className="flex aspect-video items-center justify-center">
                    <div className="flex flex-col items-center gap-3 text-center">
                      <span
                        className="flex size-16 items-center justify-center rounded-full bg-white/10 ring-1 ring-inset ring-white/20"
                        aria-hidden="true"
                      >
                        <PlayCircle className="size-9 text-white/80" />
                      </span>
                      <p className="text-sm text-white/70">Lesson video placeholder</p>
                    </div>
                  </div>
                </div>

                <div className="mt-6 leading-relaxed text-ink-700">{active.content}</div>

                {complete.isError && (
                  <Alert tone="error" className="mt-5">
                    Could not save your progress. Please try again.
                  </Alert>
                )}

                {/* Navigation --------------------------------------------- */}
                <div className="mt-8 flex flex-wrap items-center justify-between gap-3 border-t border-ink-200 pt-5">
                  <Button
                    variant="secondary"
                    disabled={activeIndex === 0}
                    onClick={() => setActiveIndex((i) => Math.max(0, i - 1))}
                  >
                    <ArrowLeft className="size-4" aria-hidden="true" />
                    Previous
                  </Button>

                  <div className="flex flex-wrap gap-3">
                    {!active.completed && (
                      <Button
                        isLoading={complete.isPending}
                        loadingText="Saving…"
                        onClick={() => complete.mutate(active.id)}
                      >
                        <Check className="size-4" aria-hidden="true" />
                        Mark as complete
                      </Button>
                    )}

                    {activeIndex < data.modules.length - 1 ? (
                      <Button
                        variant={active.completed ? 'primary' : 'secondary'}
                        onClick={() => setActiveIndex((i) => Math.min(data.modules.length - 1, i + 1))}
                      >
                        Next
                        <ArrowRight className="size-4" aria-hidden="true" />
                      </Button>
                    ) : (
                      data.assessment &&
                      active.completed && (
                        <Button onClick={() => navigate('/student/assessment/' + data.assessment!.id)}>
                          <ClipboardCheck className="size-4" aria-hidden="true" />
                          Take assessment
                        </Button>
                      )
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <Alert tone="info">This course has no modules yet.</Alert>
            )}
          </article>
        </div>
      </div>
    </>
  );
}
