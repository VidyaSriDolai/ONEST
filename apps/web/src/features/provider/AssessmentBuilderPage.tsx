import { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Check,
  ChevronDown,
  ChevronUp,
  Eye,
  GripVertical,
  Plus,
  Save,
  Trash2,
} from 'lucide-react';
import { Seo } from '@/components/seo/Seo';
import { Alert } from '@/components/ui/Alert';
import { Button } from '@/components/ui/Button';
import { TextField } from '@/components/ui/Field';
import { Badge, Card, CardHeader } from '@/components/ui/primitives';
import { ApiError } from '@/lib/api-client';
import { cn } from '@/lib/cn';
import { providerApi, type AssessmentDraft } from './provider-api';

const BLANK_QUESTION = {
  text: '',
  marks: 1,
  options: [
    { text: '', isCorrect: true },
    { text: '', isCorrect: false },
  ],
};

export default function AssessmentBuilderPage() {
  const [params, setParams] = useSearchParams();
  const queryClient = useQueryClient();
  const courseId = params.get('course') ?? '';

  const [draft, setDraft] = useState<AssessmentDraft | null>(null);
  const [preview, setPreview] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  /** Index currently being dragged, or null when no drag is in progress. */
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [dropTarget, setDropTarget] = useState<number | null>(null);
  const [focusAfterMove, setFocusAfterMove] = useState<number | null>(null);
  const moveButtonRefs = useRef<Array<HTMLButtonElement | null>>([]);

  const courses = useQuery({ queryKey: ['provider', 'courses'], queryFn: providerApi.courses });

  const existing = useQuery({
    queryKey: ['provider', 'assessment', courseId],
    queryFn: () => providerApi.assessmentFor(courseId),
    enabled: Boolean(courseId),
  });

  // Load the saved assessment for the chosen course, or start a blank one.
  useEffect(() => {
    if (!courseId) {
      setDraft(null);
      return;
    }
    if (existing.isPending) return;

    setDraft(
      existing.data ?? {
        courseId,
        title: (courses.data?.find((c) => c.id === courseId)?.title ?? 'Course') + ' — assessment',
        passingScore: 60,
        timeLimitMinutes: 30,
        maxAttempts: 3,
        publish: false,
        questions: [structuredClone(BLANK_QUESTION)],
      },
    );
  }, [courseId, existing.data, existing.isPending, courses.data]);

  // After a reorder, put focus back on the control the user just pressed so a
  // keyboard user can move an item several places without re-finding it.
  useEffect(() => {
    if (focusAfterMove === null) return;
    moveButtonRefs.current[focusAfterMove]?.focus();
    setFocusAfterMove(null);
  }, [focusAfterMove]);

  const save = useMutation({
    mutationFn: (payload: AssessmentDraft) => providerApi.saveAssessment(payload),
    onSuccess: () => {
      setError(null);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
      void queryClient.invalidateQueries({ queryKey: ['provider'] });
    },
    onError: (err) =>
      setError(err instanceof ApiError ? err.message : 'Could not save the assessment.'),
  });

  function patch(update: Partial<AssessmentDraft>) {
    setDraft((prev) => (prev ? { ...prev, ...update } : prev));
  }

  function patchQuestion(index: number, update: Partial<AssessmentDraft['questions'][number]>) {
    setDraft((prev) => {
      if (!prev) return prev;
      const questions = [...prev.questions];
      questions[index] = { ...questions[index]!, ...update };
      return { ...prev, questions };
    });
  }

  /**
   * Moves a question to a new position. The API assigns `orderIndex` from
   * array position, so reordering here is all the persistence needed.
   */
  function moveQuestion(from: number, to: number) {
    setDraft((prev) => {
      if (!prev) return prev;
      if (to < 0 || to >= prev.questions.length || from === to) return prev;

      const questions = [...prev.questions];
      const [moved] = questions.splice(from, 1);
      if (moved) questions.splice(to, 0, moved);
      return { ...prev, questions };
    });
    // Keep focus on the question that moved, so a keyboard user can press the
    // same button repeatedly without hunting for it again.
    setFocusAfterMove(to);
  }

  return (
    <>
      <Seo
        title="Assessment builder"
        description="Build the assessment that gates a certificate."
        path="/company/assessments"
        noIndex
      />

      <div className="px-4 py-6 sm:px-6 sm:py-8">
        <header className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="font-display text-2xl font-extrabold tracking-tight sm:text-3xl">
              Assessment builder
            </h1>
            <p className="mt-2 text-ink-600">
              Passing this is what unlocks a certificate, so the answer key never leaves the server.
            </p>
          </div>
          {draft && (
            <Button variant="secondary" onClick={() => setPreview((p) => !p)}>
              <Eye className="size-4" aria-hidden="true" />
              {preview ? 'Edit' : 'Preview'}
            </Button>
          )}
        </header>

        {/* Course picker ---------------------------------------------------- */}
        <Card className="mt-6 p-5">
          <label htmlFor="assessment-course" className="block text-sm font-medium text-ink-800">
            Course
          </label>
          <select
            id="assessment-course"
            value={courseId}
            onChange={(e) => setParams(e.target.value ? { course: e.target.value } : {})}
            className="mt-1.5 block w-full max-w-md rounded-xl border-0 bg-surface py-2.5 pl-3 pr-8 text-[15px] text-ink-900 ring-1 ring-inset ring-ink-200 focus:ring-2 focus:ring-inset focus:ring-brand-500"
          >
            <option value="">Choose a course…</option>
            {courses.data?.map((course) => (
              <option key={course.id} value={course.id}>
                {course.title}
                {course.hasAssessment ? ' (has assessment)' : ''}
              </option>
            ))}
          </select>
        </Card>

        {!courseId && (
          <Alert tone="info" className="mt-4">
            Pick a course to build or edit its assessment.
          </Alert>
        )}

        {draft && (
          <>
            {error && <Alert tone="error" className="mt-4">{error}</Alert>}
            {saved && (
              <Alert tone="success" className="mt-4">
                Assessment saved.
              </Alert>
            )}

            {preview ? (
              /* Preview ------------------------------------------------- */
              <Card className="mt-6 p-6">
                <Badge tone="brand">Learner preview</Badge>
                <h2 className="mt-3 font-display text-xl font-bold">{draft.title}</h2>
                <p className="mt-1 text-sm text-ink-600">
                  {draft.questions.length} questions · {draft.timeLimitMinutes} minutes · pass mark{' '}
                  {draft.passingScore}%
                </p>

                <ol className="mt-6 space-y-6">
                  {draft.questions.map((question, index) => (
                    <li key={index}>
                      <p className="font-medium text-ink-900">
                        {index + 1}. {question.text || <em className="text-ink-400">Untitled</em>}
                      </p>
                      <ul className="mt-2.5 space-y-2">
                        {question.options.map((option, optionIndex) => (
                          <li
                            key={optionIndex}
                            className="flex items-center gap-2.5 rounded-lg bg-surface px-3 py-2 text-sm ring-1 ring-inset ring-ink-200"
                          >
                            <span className="flex size-5 items-center justify-center rounded-full bg-ink-100 text-[10px] font-bold text-ink-600">
                              {String.fromCharCode(65 + optionIndex)}
                            </span>
                            {option.text || <em className="text-ink-400">Empty option</em>}
                          </li>
                        ))}
                      </ul>
                    </li>
                  ))}
                </ol>
                <p className="mt-6 text-xs text-ink-500">
                  Correct answers are hidden here because they are hidden from the learner too.
                </p>
              </Card>
            ) : (
              /* Editor -------------------------------------------------- */
              <>
                <Card className="mt-6">
                  <CardHeader title="Settings" />
                  <div className="grid gap-4 p-5 sm:grid-cols-2 lg:grid-cols-4">
                    <TextField
                      label="Title"
                      value={draft.title}
                      onChange={(e) => patch({ title: e.target.value })}
                      containerClassName="sm:col-span-2"
                    />
                    <TextField
                      label="Pass mark (%)"
                      type="number"
                      min={1}
                      max={100}
                      value={String(draft.passingScore)}
                      onChange={(e) => patch({ passingScore: Number(e.target.value) })}
                    />
                    <TextField
                      label="Time limit (min)"
                      type="number"
                      min={1}
                      value={String(draft.timeLimitMinutes)}
                      onChange={(e) => patch({ timeLimitMinutes: Number(e.target.value) })}
                    />
                    <TextField
                      label="Max attempts"
                      type="number"
                      min={1}
                      value={String(draft.maxAttempts)}
                      onChange={(e) => patch({ maxAttempts: Number(e.target.value) })}
                    />
                  </div>
                </Card>

                <Card className="mt-6">
                  <CardHeader
                    title="Questions"
                    description={draft.questions.length + ' in this assessment'}
                    action={
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() =>
                          patch({ questions: [...draft.questions, structuredClone(BLANK_QUESTION)] })
                        }
                      >
                        <Plus className="size-4" aria-hidden="true" />
                        Add question
                      </Button>
                    }
                  />

                  <ol className="divide-y divide-ink-200">
                    {draft.questions.map((question, index) => (
                      <li
                        key={index}
                        draggable
                        onDragStart={(event) => {
                          setDragIndex(index);
                          event.dataTransfer.effectAllowed = 'move';
                        }}
                        onDragOver={(event) => {
                          // Required, or the browser refuses the drop.
                          event.preventDefault();
                          event.dataTransfer.dropEffect = 'move';
                          if (dropTarget !== index) setDropTarget(index);
                        }}
                        onDrop={(event) => {
                          event.preventDefault();
                          if (dragIndex !== null) moveQuestion(dragIndex, index);
                          setDragIndex(null);
                          setDropTarget(null);
                        }}
                        onDragEnd={() => {
                          setDragIndex(null);
                          setDropTarget(null);
                        }}
                        className={cn(
                          'p-5 transition',
                          dragIndex === index && 'opacity-40',
                          dropTarget === index && dragIndex !== index && 'bg-brand-50',
                        )}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <span className="flex items-center gap-2">
                            <GripVertical
                              className="size-4 cursor-grab text-ink-300"
                              aria-hidden="true"
                            />
                            <span className="text-xs font-semibold uppercase tracking-wider text-ink-500">
                              Question {index + 1}
                            </span>
                          </span>

                          <span className="flex items-center gap-0.5">
                            {/* Dragging is not operable by keyboard, so the same
                                reordering is available as explicit buttons. */}
                            <button
                              type="button"
                              ref={(node) => {
                                moveButtonRefs.current[index] = node;
                              }}
                              onClick={() => moveQuestion(index, index - 1)}
                              disabled={index === 0}
                              className="rounded-lg p-1.5 text-ink-500 transition hover:bg-ink-100 hover:text-ink-900 disabled:opacity-30 disabled:hover:bg-transparent"
                              aria-label={'Move question ' + (index + 1) + ' up'}
                            >
                              <ChevronUp className="size-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => moveQuestion(index, index + 1)}
                              disabled={index === draft.questions.length - 1}
                              className="rounded-lg p-1.5 text-ink-500 transition hover:bg-ink-100 hover:text-ink-900 disabled:opacity-30 disabled:hover:bg-transparent"
                              aria-label={'Move question ' + (index + 1) + ' down'}
                            >
                              <ChevronDown className="size-4" />
                            </button>

                            {draft.questions.length > 1 && (
                              <button
                                type="button"
                                onClick={() =>
                                  patch({
                                    questions: draft.questions.filter((_, i) => i !== index),
                                  })
                                }
                                className="rounded-lg p-1.5 text-danger-600 transition hover:bg-danger-50"
                                aria-label={'Remove question ' + (index + 1)}
                              >
                                <Trash2 className="size-4" />
                              </button>
                            )}
                          </span>
                        </div>

                        <input
                          value={question.text}
                          onChange={(e) => patchQuestion(index, { text: e.target.value })}
                          placeholder="Question text"
                          aria-label={'Question ' + (index + 1) + ' text'}
                          className="mt-2 block w-full rounded-lg border-0 bg-surface px-3 py-2.5 text-sm ring-1 ring-inset ring-ink-200 focus:ring-2 focus:ring-inset focus:ring-brand-500"
                        />

                        <fieldset className="mt-3">
                          <legend className="text-xs text-ink-500">
                            Mark the correct answer
                          </legend>
                          <div className="mt-2 space-y-2">
                            {question.options.map((option, optionIndex) => (
                              <div key={optionIndex} className="flex items-center gap-2">
                                <input
                                  type="radio"
                                  name={'correct-' + index}
                                  checked={option.isCorrect}
                                  onChange={() =>
                                    patchQuestion(index, {
                                      options: question.options.map((o, i) => ({
                                        ...o,
                                        isCorrect: i === optionIndex,
                                      })),
                                    })
                                  }
                                  aria-label={'Option ' + (optionIndex + 1) + ' is correct'}
                                  className="size-4 border-ink-300 text-valid-600 focus:ring-valid-500"
                                />
                                <input
                                  value={option.text}
                                  onChange={(e) =>
                                    patchQuestion(index, {
                                      options: question.options.map((o, i) =>
                                        i === optionIndex ? { ...o, text: e.target.value } : o,
                                      ),
                                    })
                                  }
                                  placeholder={'Option ' + String.fromCharCode(65 + optionIndex)}
                                  aria-label={'Option ' + (optionIndex + 1) + ' text'}
                                  className={cn(
                                    'block flex-1 rounded-lg border-0 bg-surface px-3 py-2 text-sm ring-1 ring-inset transition focus:ring-2 focus:ring-inset focus:ring-brand-500',
                                    option.isCorrect ? 'ring-valid-300' : 'ring-ink-200',
                                  )}
                                />
                                {question.options.length > 2 && (
                                  <button
                                    type="button"
                                    onClick={() =>
                                      patchQuestion(index, {
                                        options: question.options.filter(
                                          (_, i) => i !== optionIndex,
                                        ),
                                      })
                                    }
                                    className="rounded-lg p-1.5 text-ink-400 transition hover:bg-ink-100 hover:text-danger-600"
                                    aria-label={'Remove option ' + (optionIndex + 1)}
                                  >
                                    <Trash2 className="size-3.5" />
                                  </button>
                                )}
                              </div>
                            ))}
                          </div>
                        </fieldset>

                        {question.options.length < 6 && (
                          <button
                            type="button"
                            onClick={() =>
                              patchQuestion(index, {
                                options: [...question.options, { text: '', isCorrect: false }],
                              })
                            }
                            className="mt-2 inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-semibold text-brand-600 transition hover:bg-brand-50"
                          >
                            <Plus className="size-3.5" aria-hidden="true" />
                            Add option
                          </button>
                        )}
                      </li>
                    ))}
                  </ol>
                </Card>

                <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
                  <label className="flex cursor-pointer items-center gap-2.5 text-sm">
                    <input
                      type="checkbox"
                      checked={draft.publish}
                      onChange={(e) => patch({ publish: e.target.checked })}
                      className="size-4 rounded border-ink-300 text-brand-600 focus:ring-brand-500"
                    />
                    Publish so learners can take it
                  </label>

                  <Button
                    isLoading={save.isPending}
                    loadingText="Saving…"
                    onClick={() => save.mutate(draft)}
                  >
                    {saved ? (
                      <Check className="size-4" aria-hidden="true" />
                    ) : (
                      <Save className="size-4" aria-hidden="true" />
                    )}
                    Save assessment
                  </Button>
                </div>

                <Alert tone="warning" className="mt-4">
                  Saving replaces the existing assessment for this course. Attempts already in
                  progress are discarded, because their answers would no longer line up.
                </Alert>
              </>
            )}
          </>
        )}
      </div>
    </>
  );
}
