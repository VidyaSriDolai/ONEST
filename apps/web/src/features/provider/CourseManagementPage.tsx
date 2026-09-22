import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Eye,
  EyeOff,
  Library,
  Plus,
  Search,
  Trash2,
  X,
} from 'lucide-react';
import { Seo } from '@/components/seo/Seo';
import { Alert } from '@/components/ui/Alert';
import { TableScroll } from '@/components/ui/TableScroll';
import { Button } from '@/components/ui/Button';
import { TextField } from '@/components/ui/Field';
import { Badge, Card, CardHeader, EmptyState, Skeleton } from '@/components/ui/primitives';
import { ApiError } from '@/lib/api-client';
import { cn } from '@/lib/cn';
import { providerApi, type CourseDraft, type ProviderCourse } from './provider-api';

const STEPS = ['Basic info', 'Modules', 'Prerequisites', 'Skills', 'Publish'] as const;

const EMPTY_DRAFT: CourseDraft = {
  title: '',
  description: '',
  category: '',
  level: 'BEGINNER',
  durationHours: 8,
  modules: [{ title: '', content: '', durationMinutes: 15 }],
  prerequisiteIds: [],
  skillIds: [],
  publish: false,
};

/** Multi-step create form, per the spec's step indicator. */
function CreateCourseWizard({ onClose }: { onClose: () => void }) {
  const queryClient = useQueryClient();
  const [step, setStep] = useState(0);
  const [draft, setDraft] = useState<CourseDraft>(EMPTY_DRAFT);
  const [error, setError] = useState<string | null>(null);

  const courses = useQuery({ queryKey: ['provider', 'courses'], queryFn: providerApi.courses });
  const skills = useQuery({ queryKey: ['provider', 'skills'], queryFn: providerApi.skills });

  const create = useMutation({
    mutationFn: (payload: CourseDraft) => providerApi.createCourse(payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['provider'] });
      onClose();
    },
    onError: (err) =>
      setError(err instanceof ApiError ? err.message : 'Could not create the course.'),
  });

  function update(patch: Partial<CourseDraft>) {
    setDraft((prev) => ({ ...prev, ...patch }));
  }

  // Each step validates only its own fields, so the learner never hits a
  // surprise error five steps later.
  function canAdvance(): boolean {
    if (step === 0) {
      return draft.title.trim().length > 2 && draft.description.trim().length > 10;
    }
    if (step === 1) {
      return draft.modules.length > 0 && draft.modules.every((m) => m.title.trim().length > 0);
    }
    return true;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto p-4 sm:p-6">
      <div className="absolute inset-0 bg-ink-950/60" onClick={onClose} aria-hidden="true" />

      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="wizard-title"
        className="relative my-4 w-full max-w-2xl rounded-2xl bg-surface shadow-lifted animate-fade-up"
      >
        <div className="flex items-start justify-between gap-4 border-b border-ink-200 p-5">
          <div>
            <h2 id="wizard-title" className="font-display text-lg font-bold">
              Create a course
            </h2>
            <p className="mt-0.5 text-sm text-ink-600">
              Step {step + 1} of {STEPS.length} — {STEPS[step]}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex size-9 items-center justify-center rounded-xl text-ink-500 transition hover:bg-ink-100"
            aria-label="Close"
          >
            <X className="size-5" />
          </button>
        </div>

        {/* Step indicator ------------------------------------------------- */}
        <ol className="flex items-center gap-1.5 overflow-x-auto border-b border-ink-200 px-5 py-3">
          {STEPS.map((label, index) => (
            <li key={label} className="flex items-center gap-1.5">
              <span
                className={cn(
                  'flex size-6 shrink-0 items-center justify-center rounded-full text-[11px] font-bold',
                  index < step
                    ? 'bg-valid-500 text-white'
                    : index === step
                      ? 'bg-brand-600 text-white'
                      : 'bg-ink-200 text-ink-500',
                )}
              >
                {index < step ? <Check className="size-3" aria-hidden="true" /> : index + 1}
              </span>
              <span
                className={cn(
                  'whitespace-nowrap text-xs',
                  index === step ? 'font-semibold text-ink-900' : 'text-ink-500',
                )}
              >
                {label}
              </span>
              {index < STEPS.length - 1 && (
                <span className="mx-1 h-px w-4 bg-ink-200" aria-hidden="true" />
              )}
            </li>
          ))}
        </ol>

        <div className="max-h-[55vh] overflow-y-auto p-5">
          {error && <Alert tone="error" className="mb-4">{error}</Alert>}

          {/* Step 1 — basic info ------------------------------------------ */}
          {step === 0 && (
            <div className="space-y-4">
              <TextField
                label="Course title"
                value={draft.title}
                onChange={(e) => update({ title: e.target.value })}
                placeholder="Advanced TypeScript"
                required
              />
              <div>
                <label
                  htmlFor="course-description"
                  className="block text-sm font-medium text-ink-800"
                >
                  Description <span className="text-danger-600">*</span>
                </label>
                <textarea
                  id="course-description"
                  value={draft.description}
                  onChange={(e) => update({ description: e.target.value })}
                  rows={3}
                  placeholder="What a learner will be able to do after finishing."
                  className="mt-1.5 block w-full rounded-xl border-0 bg-surface px-3.5 py-2.5 text-[15px] text-ink-900 ring-1 ring-inset ring-ink-200 transition placeholder:text-ink-400 focus:ring-2 focus:ring-inset focus:ring-brand-500"
                />
              </div>
              <div className="grid gap-4 sm:grid-cols-3">
                <TextField
                  label="Category"
                  value={draft.category}
                  onChange={(e) => update({ category: e.target.value })}
                  placeholder="Programming"
                />
                <div>
                  <label htmlFor="course-level" className="block text-sm font-medium text-ink-800">
                    Level
                  </label>
                  <select
                    id="course-level"
                    value={draft.level}
                    onChange={(e) => update({ level: e.target.value })}
                    className="mt-1.5 block w-full rounded-xl border-0 bg-surface py-2.5 pl-3 pr-8 text-[15px] text-ink-900 ring-1 ring-inset ring-ink-200 focus:ring-2 focus:ring-inset focus:ring-brand-500"
                  >
                    <option value="BEGINNER">Beginner</option>
                    <option value="INTERMEDIATE">Intermediate</option>
                    <option value="ADVANCED">Advanced</option>
                  </select>
                </div>
                <TextField
                  label="Duration (hours)"
                  type="number"
                  min={1}
                  value={String(draft.durationHours)}
                  onChange={(e) => update({ durationHours: Number(e.target.value) })}
                />
              </div>
            </div>
          )}

          {/* Step 2 — modules --------------------------------------------- */}
          {step === 1 && (
            <div className="space-y-3">
              {draft.modules.map((module, index) => (
                <div key={index} className="rounded-xl bg-ink-50 p-4 ring-1 ring-inset ring-ink-200">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-semibold uppercase tracking-wider text-ink-500">
                      Module {index + 1}
                    </span>
                    {draft.modules.length > 1 && (
                      <button
                        type="button"
                        onClick={() =>
                          update({ modules: draft.modules.filter((_, i) => i !== index) })
                        }
                        className="rounded-lg p-1.5 text-danger-600 transition hover:bg-danger-50"
                        aria-label={'Remove module ' + (index + 1)}
                      >
                        <Trash2 className="size-4" />
                      </button>
                    )}
                  </div>
                  <input
                    value={module.title}
                    onChange={(e) => {
                      const next = [...draft.modules];
                      next[index] = { ...module, title: e.target.value };
                      update({ modules: next });
                    }}
                    placeholder="Module title"
                    aria-label={'Module ' + (index + 1) + ' title'}
                    className="mt-2 block w-full rounded-lg border-0 bg-surface px-3 py-2 text-sm ring-1 ring-inset ring-ink-200 focus:ring-2 focus:ring-inset focus:ring-brand-500"
                  />
                  <textarea
                    value={module.content}
                    onChange={(e) => {
                      const next = [...draft.modules];
                      next[index] = { ...module, content: e.target.value };
                      update({ modules: next });
                    }}
                    rows={2}
                    placeholder="What this module covers"
                    aria-label={'Module ' + (index + 1) + ' content'}
                    className="mt-2 block w-full rounded-lg border-0 bg-surface px-3 py-2 text-sm ring-1 ring-inset ring-ink-200 focus:ring-2 focus:ring-inset focus:ring-brand-500"
                  />
                </div>
              ))}
              <Button
                variant="secondary"
                size="sm"
                onClick={() =>
                  update({
                    modules: [...draft.modules, { title: '', content: '', durationMinutes: 15 }],
                  })
                }
              >
                <Plus className="size-4" aria-hidden="true" />
                Add module
              </Button>
            </div>
          )}

          {/* Step 3 — prerequisites --------------------------------------- */}
          {step === 2 && (
            <div>
              <p className="text-sm text-ink-600">
                Learners must complete these before they can enrol. Only your own courses can be
                prerequisites.
              </p>
              <ul className="mt-3 space-y-2">
                {courses.data?.length ? (
                  courses.data.map((course) => (
                    <li key={course.id}>
                      <label className="flex cursor-pointer items-center gap-3 rounded-xl bg-surface px-4 py-3 text-sm ring-1 ring-inset ring-ink-200 transition hover:bg-ink-50">
                        <input
                          type="checkbox"
                          checked={draft.prerequisiteIds.includes(course.id)}
                          onChange={(e) =>
                            update({
                              prerequisiteIds: e.target.checked
                                ? [...draft.prerequisiteIds, course.id]
                                : draft.prerequisiteIds.filter((id) => id !== course.id),
                            })
                          }
                          className="size-4 rounded border-ink-300 text-brand-600 focus:ring-brand-500"
                        />
                        <span className="flex-1 font-medium text-ink-800">{course.title}</span>
                        <Badge tone="neutral">{course.category}</Badge>
                      </label>
                    </li>
                  ))
                ) : (
                  <li className="text-sm text-ink-500">
                    You have no other courses to use as prerequisites.
                  </li>
                )}
              </ul>
            </div>
          )}

          {/* Step 4 — skills ---------------------------------------------- */}
          {step === 3 && (
            <div>
              <p className="text-sm text-ink-600">
                Skills this course validates. These flow through to certificates.
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                {skills.data?.map((skill) => {
                  const selected = draft.skillIds.includes(skill.id);
                  return (
                    <button
                      key={skill.id}
                      type="button"
                      onClick={() =>
                        update({
                          skillIds: selected
                            ? draft.skillIds.filter((id) => id !== skill.id)
                            : [...draft.skillIds, skill.id],
                        })
                      }
                      aria-pressed={selected}
                      className={cn(
                        'rounded-full px-3 py-1.5 text-sm font-medium ring-1 ring-inset transition',
                        selected
                          ? 'bg-brand-600 text-white ring-brand-600'
                          : 'bg-surface text-ink-700 ring-ink-200 hover:bg-ink-50',
                      )}
                    >
                      {skill.name}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Step 5 — publish --------------------------------------------- */}
          {step === 4 && (
            <div>
              <dl className="space-y-3 rounded-xl bg-ink-50 p-4 text-sm ring-1 ring-inset ring-ink-200">
                <div className="flex justify-between gap-4">
                  <dt className="text-ink-500">Title</dt>
                  <dd className="text-right font-medium text-ink-900">{draft.title || '—'}</dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-ink-500">Modules</dt>
                  <dd className="font-medium text-ink-900">{draft.modules.length}</dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-ink-500">Prerequisites</dt>
                  <dd className="font-medium text-ink-900">{draft.prerequisiteIds.length}</dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-ink-500">Skills</dt>
                  <dd className="font-medium text-ink-900">{draft.skillIds.length}</dd>
                </div>
              </dl>

              <label className="mt-4 flex cursor-pointer items-start gap-3 rounded-xl bg-surface p-4 ring-1 ring-inset ring-ink-200">
                <input
                  type="checkbox"
                  checked={draft.publish}
                  onChange={(e) => update({ publish: e.target.checked })}
                  className="mt-0.5 size-4 rounded border-ink-300 text-brand-600 focus:ring-brand-500"
                />
                <span>
                  <span className="block text-sm font-semibold text-ink-900">
                    Publish immediately
                  </span>
                  <span className="block text-xs text-ink-600">
                    Leave unchecked to save as a draft. You can publish from the course list later.
                  </span>
                </span>
              </label>
            </div>
          )}
        </div>

        {/* Footer ---------------------------------------------------------- */}
        <div className="flex items-center justify-between gap-3 border-t border-ink-200 p-5">
          <Button
            variant="secondary"
            disabled={step === 0}
            onClick={() => setStep((s) => Math.max(0, s - 1))}
          >
            <ArrowLeft className="size-4" aria-hidden="true" />
            Back
          </Button>

          {step < STEPS.length - 1 ? (
            <Button disabled={!canAdvance()} onClick={() => setStep((s) => s + 1)}>
              Next
              <ArrowRight className="size-4" aria-hidden="true" />
            </Button>
          ) : (
            <Button
              isLoading={create.isPending}
              loadingText="Creating…"
              onClick={() => create.mutate(draft)}
            >
              <Check className="size-4" aria-hidden="true" />
              Create course
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

export default function CourseManagementPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [wizardOpen, setWizardOpen] = useState(false);

  const { data, isPending } = useQuery<ProviderCourse[]>({
    queryKey: ['provider', 'courses'],
    queryFn: providerApi.courses,
  });

  const togglePublish = useMutation({
    mutationFn: ({ id, next }: { id: string; next: boolean }) =>
      providerApi.setPublished(id, next),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['provider'] }),
  });

  const filtered = (data ?? []).filter((course) =>
    search ? course.title.toLowerCase().includes(search.toLowerCase()) : true,
  );

  return (
    <>
      <Seo
        title="Course management"
        description="Create, publish and manage your courses."
        path="/company/courses"
        noIndex
      />

      <div className="px-4 py-6 sm:px-6 sm:py-8">
        <header className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="font-display text-2xl font-extrabold tracking-tight sm:text-3xl">
              Courses
            </h1>
            <p className="mt-2 text-ink-600">Create, publish and track every course you offer.</p>
          </div>
          <Button onClick={() => setWizardOpen(true)}>
            <Plus className="size-4" aria-hidden="true" />
            New course
          </Button>
        </header>

        <Card className="mt-6">
          <CardHeader
            title="All courses"
            action={
              <div className="relative">
                <label htmlFor="provider-course-search" className="sr-only">
                  Search courses
                </label>
                <Search
                  className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-ink-400"
                  aria-hidden="true"
                />
                <input
                  id="provider-course-search"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search"
                  className="w-44 rounded-lg border-0 bg-surface py-2 pl-9 pr-3 text-sm ring-1 ring-inset ring-ink-200 focus:ring-2 focus:ring-inset focus:ring-brand-500"
                />
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
                icon={<Library className="size-6" />}
                title={search ? 'No courses match' : 'No courses yet'}
                description={
                  search
                    ? 'Try a different search term.'
                    : 'Create your first course to start enrolling learners.'
                }
                action={
                  !search && (
                    <Button onClick={() => setWizardOpen(true)}>
                      <Plus className="size-4" aria-hidden="true" />
                      New course
                    </Button>
                  )
                }
              />
            </div>
          ) : (
            <TableScroll label="Course list">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-ink-200 bg-ink-50">
                  <tr>
                    <th scope="col" className="px-5 py-3 font-semibold text-ink-600">
                      Course
                    </th>
                    <th scope="col" className="hidden px-5 py-3 font-semibold text-ink-600 sm:table-cell">
                      Modules
                    </th>
                    <th scope="col" className="px-5 py-3 font-semibold text-ink-600">
                      Learners
                    </th>
                    <th scope="col" className="px-5 py-3 font-semibold text-ink-600">
                      Status
                    </th>
                    <th scope="col" className="px-5 py-3 text-right font-semibold text-ink-600">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-ink-200">
                  {filtered.map((course) => (
                    <tr key={course.id} className="transition hover:bg-ink-50">
                      <td className="px-5 py-3">
                        <span className="block font-medium text-ink-900">{course.title}</span>
                        <span className="block text-xs text-ink-500">
                          {course.category} · {course.level.toLowerCase()}
                          {!course.hasAssessment && ' · no assessment'}
                        </span>
                      </td>
                      <td className="hidden px-5 py-3 text-ink-600 sm:table-cell">
                        {course.moduleCount}
                      </td>
                      <td className="px-5 py-3 text-ink-600">
                        {course.enrolledCount}
                        <span className="text-xs text-ink-400">
                          {' '}
                          ({course.completedCount} done)
                        </span>
                      </td>
                      <td className="px-5 py-3">
                        {course.isPublished ? (
                          <Badge tone="valid">Published</Badge>
                        ) : (
                          <Badge tone="neutral">Draft</Badge>
                        )}
                      </td>
                      <td className="px-5 py-3">
                        <div className="flex justify-end gap-1.5">
                          <Link to={'/company/assessments?course=' + course.id}>
                            <Button variant="ghost" size="sm">
                              Assessment
                            </Button>
                          </Link>
                          <Button
                            variant="ghost"
                            size="sm"
                            isLoading={
                              togglePublish.isPending && togglePublish.variables?.id === course.id
                            }
                            onClick={() =>
                              togglePublish.mutate({ id: course.id, next: !course.isPublished })
                            }
                          >
                            {course.isPublished ? (
                              <>
                                <EyeOff className="size-4" aria-hidden="true" />
                                Unpublish
                              </>
                            ) : (
                              <>
                                <Eye className="size-4" aria-hidden="true" />
                                Publish
                              </>
                            )}
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </TableScroll>
          )}
        </Card>
      </div>

      {wizardOpen && <CreateCourseWizard onClose={() => setWizardOpen(false)} />}
    </>
  );
}
