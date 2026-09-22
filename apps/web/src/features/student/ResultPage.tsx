import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, Award, Check, Loader2, RotateCcw, X } from 'lucide-react';
import { Seo } from '@/components/seo/Seo';
import { Alert } from '@/components/ui/Alert';
import { Button } from '@/components/ui/Button';
import { Card, CardHeader, ProgressRing } from '@/components/ui/primitives';
import { ApiError } from '@/lib/api-client';
import { cn } from '@/lib/cn';
import { studentApi, type AttemptResult } from './student-api';

/**
 * Lightweight CSS confetti for a pass.
 *
 * Hand-rolled rather than pulled from a package: it is ~30 absolutely
 * positioned divs, and it respects prefers-reduced-motion by not rendering at
 * all, which a canvas library would not do for free.
 */
function Confetti() {
  const pieces = useMemo(
    () =>
      Array.from({ length: 36 }, (_, index) => ({
        id: index,
        left: Math.random() * 100,
        delay: Math.random() * 0.6,
        duration: 2.4 + Math.random() * 1.6,
        rotate: Math.random() * 360,
        colour: ['#4f46e5', '#10b981', '#f59e0b', '#6366f1', '#fbbf24'][index % 5],
        size: 6 + Math.random() * 6,
      })),
    [],
  );

  const [enabled] = useState(
    () => !window.matchMedia('(prefers-reduced-motion: reduce)').matches,
  );

  if (!enabled) return null;

  return (
    <div className="pointer-events-none fixed inset-0 z-50 overflow-hidden" aria-hidden="true">
      <style>
        {'@keyframes confetti-fall{0%{transform:translateY(-10vh) rotate(0deg);opacity:1}100%{transform:translateY(105vh) rotate(720deg);opacity:0}}'}
      </style>
      {pieces.map((piece) => (
        <span
          key={piece.id}
          style={{
            position: 'absolute',
            left: piece.left + '%',
            top: 0,
            width: piece.size,
            height: piece.size * 1.6,
            background: piece.colour,
            borderRadius: 2,
            transform: 'rotate(' + piece.rotate + 'deg)',
            animation: `confetti-fall ${piece.duration}s ${piece.delay}s cubic-bezier(0.25,0.6,0.5,1) forwards`,
          }}
        />
      ))}
    </div>
  );
}

export default function ResultPage() {
  const { attemptId = '' } = useParams<{ attemptId: string }>();
  const [showConfetti, setShowConfetti] = useState(false);

  const { data, isPending, isError, error } = useQuery<AttemptResult>({
    queryKey: ['result', attemptId],
    queryFn: () => studentApi.result(attemptId),
    enabled: Boolean(attemptId),
    retry: false,
  });

  useEffect(() => {
    if (!data?.passed) return;
    setShowConfetti(true);
    const timer = setTimeout(() => setShowConfetti(false), 4500);
    return () => clearTimeout(timer);
  }, [data?.passed]);

  if (isPending) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Loader2 className="size-6 animate-spin text-ink-400" aria-hidden="true" />
        <span className="sr-only">Loading your result…</span>
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="px-4 py-8 sm:px-6">
        <Alert tone="error" title="We could not load that result">
          {error instanceof ApiError ? error.message : 'Please try again in a moment.'}
        </Alert>
        <Link to="/student/dashboard" className="mt-5 inline-block">
          <Button variant="secondary">
            <ArrowLeft className="size-4" aria-hidden="true" />
            Back to dashboard
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <>
      <Seo title="Assessment result" description="Your assessment result." path="/student/result" noIndex />
      {showConfetti && <Confetti />}

      <div className="px-4 py-6 sm:px-6 sm:py-8">
        <div className="mx-auto max-w-3xl">
          {/* Score --------------------------------------------------------- */}
          <Card className="p-6 text-center sm:p-8">
            <ProgressRing
              value={data.score}
              size={150}
              stroke={12}
              label={data.score + '%'}
              sublabel={'pass mark ' + data.passingScore + '%'}
              tone={data.passed ? 'valid' : 'danger'}
            />

            <h1
              className={cn(
                'mt-5 font-display text-3xl font-extrabold tracking-tight',
                data.passed ? 'text-valid-700' : 'text-danger-700',
              )}
            >
              {data.passed ? 'Passed' : 'Not passed'}
            </h1>
            <p className="mt-2 text-ink-600">
              {data.courseTitle} · {data.correctCount} of {data.totalQuestions} correct
            </p>

            {data.autoSubmitted && (
              <Alert tone="warning" className="mx-auto mt-5 max-w-md text-left">
                This attempt was submitted automatically when the timer ran out.
              </Alert>
            )}

            <div className="mt-6 flex flex-wrap justify-center gap-3">
              {data.passed ? (
                <Link to="/student/certifications">
                  <Button size="lg">
                    <Award className="size-4" aria-hidden="true" />
                    Check certification progress
                  </Button>
                </Link>
              ) : data.canRetake ? (
                <Link to={'/student/courses/' + data.courseSlug}>
                  <Button size="lg">
                    <RotateCcw className="size-4" aria-hidden="true" />
                    Retake assessment
                  </Button>
                </Link>
              ) : (
                <Alert tone="error" className="text-left">
                  You have used all {data.maxAttempts} attempts for this assessment.
                </Alert>
              )}

              <Link to={'/student/learn/' + data.courseSlug}>
                <Button variant="secondary" size="lg">
                  Review the course
                </Button>
              </Link>
            </div>

            <p className="mt-4 text-xs text-ink-500">
              Attempt {data.attemptsUsed} of {data.maxAttempts}
            </p>
          </Card>

          {/* Per-question review -------------------------------------------- */}
          <Card className="mt-6">
            <CardHeader
              title="Question review"
              description="Your answer against the correct one."
            />
            <ol className="divide-y divide-ink-200">
              {data.review.map((item, index) => (
                <li key={item.questionId} className="p-5">
                  <div className="flex items-start gap-3">
                    <span
                      className={cn(
                        'flex size-6 shrink-0 items-center justify-center rounded-full',
                        item.isCorrect
                          ? 'bg-valid-100 text-valid-700'
                          : 'bg-danger-100 text-danger-700',
                      )}
                      aria-hidden="true"
                    >
                      {item.isCorrect ? (
                        <Check className="size-3.5" />
                      ) : (
                        <X className="size-3.5" />
                      )}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-semibold uppercase tracking-wider text-ink-500">
                        Question {index + 1}
                        <span className="sr-only">
                          {item.isCorrect ? ', answered correctly' : ', answered incorrectly'}
                        </span>
                      </p>
                      <p className="mt-1 font-medium text-ink-900">{item.text}</p>

                      <ul className="mt-3 space-y-1.5">
                        {item.options.map((option) => {
                          const chosen = option.id === item.selectedOptionId;
                          return (
                            <li
                              key={option.id}
                              className={cn(
                                'flex items-center gap-2 rounded-lg px-3 py-2 text-sm ring-1 ring-inset',
                                option.isCorrect
                                  ? 'bg-valid-50 text-valid-800 ring-valid-200'
                                  : chosen
                                    ? 'bg-danger-50 text-danger-800 ring-danger-200'
                                    : 'bg-surface text-ink-600 ring-ink-200',
                              )}
                            >
                              <span className="min-w-0 flex-1">{option.text}</span>
                              {option.isCorrect && (
                                <span className="shrink-0 text-xs font-semibold">Correct</span>
                              )}
                              {chosen && !option.isCorrect && (
                                <span className="shrink-0 text-xs font-semibold">Your answer</span>
                              )}
                            </li>
                          );
                        })}
                      </ul>

                      {item.selectedOptionId === null && (
                        <p className="mt-2 text-xs text-ink-500">You did not answer this one.</p>
                      )}
                    </div>
                  </div>
                </li>
              ))}
            </ol>
          </Card>
        </div>
      </div>
    </>
  );
}
