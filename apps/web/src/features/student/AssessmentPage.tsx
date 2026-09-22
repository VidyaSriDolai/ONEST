import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery } from '@tanstack/react-query';
import { AlertTriangle, ArrowLeft, ArrowRight, Clock, Loader2, Send } from 'lucide-react';
import { Seo } from '@/components/seo/Seo';
import { Alert } from '@/components/ui/Alert';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/primitives';
import { ApiError } from '@/lib/api-client';
import { cn } from '@/lib/cn';
import { studentApi, type ActiveAttempt } from './student-api';

function formatClock(seconds: number): string {
  const m = Math.floor(Math.max(0, seconds) / 60);
  const s = Math.max(0, seconds) % 60;
  return String(m).padStart(2, '0') + ':' + String(s).padStart(2, '0');
}

export default function AssessmentPage() {
  const { assessmentId = '' } = useParams<{ assessmentId: string }>();
  const navigate = useNavigate();

  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [current, setCurrent] = useState(0);
  const [secondsLeft, setSecondsLeft] = useState<number | null>(null);
  const [confirming, setConfirming] = useState(false);
  const hasSubmitted = useRef(false);

  // The attempt is created server-side on mount; retry is off so a failure
  // (no attempts left, not enrolled) surfaces immediately rather than looping.
  const { data, isPending, isError, error } = useQuery<ActiveAttempt>({
    queryKey: ['attempt', assessmentId],
    queryFn: () => studentApi.startAttempt(assessmentId),
    enabled: Boolean(assessmentId),
    retry: false,
    refetchOnWindowFocus: false,
    staleTime: Infinity,
  });

  const saveAnswer = useMutation({
    mutationFn: ({ questionId, optionId }: { questionId: string; optionId: string }) =>
      studentApi.saveAnswer(data!.attemptId, questionId, optionId),
  });

  const submit = useMutation({
    mutationFn: (auto: boolean) => studentApi.submitAttempt(data!.attemptId, auto),
    onSuccess: (result) => navigate('/student/result/' + result.attemptId, { replace: true }),
  });

  // Seed local state from the server's record of the attempt.
  useEffect(() => {
    if (!data) return;
    setAnswers(data.savedAnswers);
    setSecondsLeft(data.secondsRemaining);
  }, [data?.attemptId]);

  const doSubmit = useCallback(
    (auto: boolean) => {
      if (hasSubmitted.current) return;
      hasSubmitted.current = true;
      submit.mutate(auto);
    },
    [submit],
  );

  // Countdown. The server computed the starting value, so a client clock that
  // is wrong or tampered with cannot buy extra time — at worst the UI is out
  // of step and the server still grades what it received.
  useEffect(() => {
    if (secondsLeft === null) return;
    if (secondsLeft <= 0) {
      doSubmit(true);
      return;
    }
    const timer = setTimeout(() => setSecondsLeft((s) => (s === null ? null : s - 1)), 1000);
    return () => clearTimeout(timer);
  }, [secondsLeft, doSubmit]);

  function choose(questionId: string, optionId: string) {
    setAnswers((prev) => ({ ...prev, [questionId]: optionId }));
    // Persisted as the learner goes, so a crash or reload loses nothing.
    saveAnswer.mutate({ questionId, optionId });
  }

  if (isPending) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Loader2 className="size-6 animate-spin text-ink-400" aria-hidden="true" />
        <span className="sr-only">Preparing your assessment…</span>
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="px-4 py-8 sm:px-6">
        <Alert tone="error" title="We could not start that assessment">
          {error instanceof ApiError ? error.message : 'Please try again in a moment.'}
        </Alert>
        <Link to="/student/courses" className="mt-5 inline-block">
          <Button variant="secondary">
            <ArrowLeft className="size-4" aria-hidden="true" />
            Back to courses
          </Button>
        </Link>
      </div>
    );
  }

  const question = data.questions[current];
  const answeredCount = Object.keys(answers).length;
  const isLastMinute = secondsLeft !== null && secondsLeft <= 60;

  return (
    <>
      <Seo title={data.title} description="Timed assessment." path="/student/assessment" noIndex />

      <div className="px-4 py-6 sm:px-6 sm:py-8">
        {/* Header with timer --------------------------------------------- */}
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <h1 className="font-display text-xl font-extrabold tracking-tight sm:text-2xl">
              {data.title}
            </h1>
            <p className="mt-1 text-sm text-ink-600">
              {data.courseTitle} · pass mark {data.passingScore}% · attempt{' '}
              {data.attemptsUsed + 1} of {data.maxAttempts}
            </p>
          </div>

          <div
            className={cn(
              'flex items-center gap-2 rounded-xl px-4 py-2.5 font-mono text-lg font-bold tabular-nums ring-1 ring-inset transition-colors',
              isLastMinute
                ? 'bg-danger-50 text-danger-700 ring-danger-200'
                : 'bg-surface text-ink-900 ring-ink-200',
            )}
            // Only the final minute is announced, so the timer does not
            // interrupt a screen reader every single second.
            role="timer"
            aria-live={isLastMinute ? 'assertive' : 'off'}
          >
            <Clock className={cn('size-5', isLastMinute && 'animate-pulse')} aria-hidden="true" />
            {secondsLeft === null ? '--:--' : formatClock(secondsLeft)}
          </div>
        </div>

        {isLastMinute && (
          <Alert tone="error" className="mt-4">
            Less than a minute left. Your answers are saved as you go and will be submitted
            automatically when the timer reaches zero.
          </Alert>
        )}

        <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_15rem]">
          {/* Question ------------------------------------------------------ */}
          <div className="min-w-0">
            {question ? (
              <Card className="p-6 sm:p-8">
                <p className="text-xs font-semibold uppercase tracking-wider text-brand-600">
                  Question {current + 1} of {data.questions.length}
                </p>
                <h2 className="mt-2 font-display text-lg font-bold leading-snug text-ink-900 sm:text-xl">
                  {question.text}
                </h2>

                <fieldset className="mt-6">
                  <legend className="sr-only">Choose one answer</legend>
                  <div className="space-y-2.5">
                    {question.options.map((option, index) => {
                      const selected = answers[question.id] === option.id;
                      return (
                        <label
                          key={option.id}
                          className={cn(
                            'flex cursor-pointer items-start gap-3 rounded-xl p-4 ring-1 ring-inset transition',
                            selected
                              ? 'bg-brand-50 ring-2 ring-brand-500'
                              : 'bg-surface ring-ink-200 hover:bg-ink-50 hover:ring-ink-300',
                          )}
                        >
                          <input
                            type="radio"
                            name={question.id}
                            checked={selected}
                            onChange={() => choose(question.id, option.id)}
                            className="sr-only"
                          />
                          <span
                            className={cn(
                              'flex size-6 shrink-0 items-center justify-center rounded-full text-xs font-bold ring-1 ring-inset transition',
                              selected
                                ? 'bg-brand-600 text-white ring-brand-600'
                                : 'bg-surface text-ink-500 ring-ink-300',
                            )}
                            aria-hidden="true"
                          >
                            {String.fromCharCode(65 + index)}
                          </span>
                          <span className="min-w-0 flex-1 text-sm text-ink-800">{option.text}</span>
                        </label>
                      );
                    })}
                  </div>
                </fieldset>

                <div className="mt-7 flex items-center justify-between gap-3 border-t border-ink-200 pt-5">
                  <Button
                    variant="secondary"
                    disabled={current === 0}
                    onClick={() => setCurrent((c) => Math.max(0, c - 1))}
                  >
                    <ArrowLeft className="size-4" aria-hidden="true" />
                    Previous
                  </Button>

                  {current < data.questions.length - 1 ? (
                    <Button onClick={() => setCurrent((c) => c + 1)}>
                      Next
                      <ArrowRight className="size-4" aria-hidden="true" />
                    </Button>
                  ) : (
                    <Button onClick={() => setConfirming(true)}>
                      <Send className="size-4" aria-hidden="true" />
                      Submit
                    </Button>
                  )}
                </div>
              </Card>
            ) : (
              <Alert tone="info">This assessment has no questions yet.</Alert>
            )}
          </div>

          {/* Navigator ------------------------------------------------------ */}
          <aside>
            <Card className="sticky top-24 p-4">
              <h2 className="text-xs font-semibold uppercase tracking-wider text-ink-500">
                Questions
              </h2>
              <ol className="mt-3 grid grid-cols-6 gap-2 lg:grid-cols-5">
                {data.questions.map((q, index) => {
                  const answered = Boolean(answers[q.id]);
                  return (
                    <li key={q.id}>
                      <button
                        type="button"
                        onClick={() => setCurrent(index)}
                        className={cn(
                          'flex size-9 items-center justify-center rounded-lg text-sm font-semibold transition',
                          index === current
                            ? 'bg-brand-600 text-white'
                            : answered
                              ? 'bg-brand-100 text-brand-700 hover:bg-brand-200'
                              : 'bg-ink-100 text-ink-500 hover:bg-ink-200',
                        )}
                        aria-label={
                          'Question ' + (index + 1) + (answered ? ', answered' : ', not answered')
                        }
                        aria-current={index === current ? 'true' : undefined}
                      >
                        {index + 1}
                      </button>
                    </li>
                  );
                })}
              </ol>

              <p className="mt-4 text-xs text-ink-500">
                {answeredCount} of {data.questions.length} answered
              </p>

              <Button fullWidth className="mt-3" onClick={() => setConfirming(true)}>
                <Send className="size-4" aria-hidden="true" />
                Submit
              </Button>
            </Card>
          </aside>
        </div>
      </div>

      {/* Submit confirmation ---------------------------------------------- */}
      {confirming && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-ink-950/60"
            onClick={() => setConfirming(false)}
            aria-hidden="true"
          />
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="submit-title"
            className="relative w-full max-w-md rounded-2xl bg-surface p-6 shadow-lifted animate-fade-up"
          >
            <span className="flex size-11 items-center justify-center rounded-xl bg-accent-50 text-accent-600">
              <AlertTriangle className="size-5" aria-hidden="true" />
            </span>
            <h2 id="submit-title" className="mt-4 font-display text-lg font-bold">
              Submit your assessment?
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-ink-600">
              You have answered {answeredCount} of {data.questions.length} questions.
              {answeredCount < data.questions.length &&
                ' Unanswered questions are marked incorrect.'}{' '}
              This cannot be undone.
            </p>

            {submit.isError && (
              <Alert tone="error" className="mt-4">
                {submit.error instanceof ApiError
                  ? submit.error.message
                  : 'Could not submit. Please try again.'}
              </Alert>
            )}

            <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <Button variant="secondary" onClick={() => setConfirming(false)}>
                Keep working
              </Button>
              <Button
                isLoading={submit.isPending}
                loadingText="Submitting…"
                onClick={() => doSubmit(false)}
              >
                <Send className="size-4" aria-hidden="true" />
                Submit now
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
