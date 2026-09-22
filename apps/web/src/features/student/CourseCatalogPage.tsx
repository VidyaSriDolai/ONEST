import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { BookOpen, Clock, Library, Search, Star } from 'lucide-react';
import { Seo } from '@/components/seo/Seo';
import { Badge, Card, EmptyState, ProgressBar, SkeletonCards } from '@/components/ui/primitives';
import { studentApi, type CourseCard } from './student-api';
import { cn } from '@/lib/cn';

const LEVELS = [
  { value: '', label: 'All levels' },
  { value: 'BEGINNER', label: 'Beginner' },
  { value: 'INTERMEDIATE', label: 'Intermediate' },
  { value: 'ADVANCED', label: 'Advanced' },
];

const LEVEL_TONE: Record<string, 'valid' | 'brand' | 'accent'> = {
  BEGINNER: 'valid',
  INTERMEDIATE: 'brand',
  ADVANCED: 'accent',
};

function CourseTile({ course }: { course: CourseCard }) {
  return (
    <Link
      to={'/student/courses/' + course.slug}
      className="group flex flex-col rounded-2xl bg-surface shadow-card ring-1 ring-ink-200 transition duration-300 hover:-translate-y-1 hover:shadow-lifted hover:ring-brand-200"
    >
      {/* Thumbnail stand-in: a deterministic gradient keyed to the category, so
          a course always looks the same without needing uploaded artwork. */}
      <div
        className={cn(
          'flex h-28 items-center justify-center rounded-t-2xl bg-gradient-to-br',
          course.category === 'Frontend'
            ? 'from-brand-500 to-brand-700'
            : course.category === 'Backend'
              ? 'from-valid-500 to-valid-700'
              : course.category === 'Databases'
                ? 'from-accent-500 to-accent-700'
                : course.category === 'DevOps'
                  ? 'from-ink-600 to-ink-800'
                  : 'from-brand-400 to-brand-600',
        )}
      >
        <BookOpen className="size-9 text-white/90" aria-hidden="true" />
      </div>

      <div className="flex flex-1 flex-col p-5">
        <div className="flex flex-wrap items-center gap-2">
          <Badge tone="neutral">{course.category}</Badge>
          <Badge tone={LEVEL_TONE[course.level] ?? 'neutral'}>
            {course.level.charAt(0) + course.level.slice(1).toLowerCase()}
          </Badge>
        </div>

        <h3 className="mt-3 font-display text-lg font-bold text-ink-900 group-hover:text-brand-700">
          {course.title}
        </h3>
        <p className="mt-1.5 line-clamp-2 flex-1 text-sm leading-relaxed text-ink-600">
          {course.description}
        </p>

        <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-ink-500">
          <span className="inline-flex items-center gap-1">
            <Clock className="size-3.5" aria-hidden="true" />
            {course.durationHours}h
          </span>
          <span className="inline-flex items-center gap-1">
            <Library className="size-3.5" aria-hidden="true" />
            {course.moduleCount} modules
          </span>
          {course.rating !== null && (
            <span className="inline-flex items-center gap-1">
              <Star className="size-3.5 fill-accent-400 text-accent-400" aria-hidden="true" />
              {course.rating.toFixed(1)}
            </span>
          )}
        </div>

        {course.enrollment ? (
          <div className="mt-4 border-t border-ink-200 pt-3">
            <div className="flex items-center justify-between text-xs">
              <span className="font-medium text-ink-700">
                {course.enrollment.status === 'COMPLETED' ? 'Completed' : 'In progress'}
              </span>
            </div>
            <ProgressBar
              value={course.enrollment.progressPercent}
              className="mt-2"
              tone={course.enrollment.status === 'COMPLETED' ? 'valid' : 'brand'}
              showLabel
              label={course.title + ' progress'}
            />
          </div>
        ) : (
          <p className="mt-4 border-t border-ink-200 pt-3 text-xs text-ink-500">
            {course.providerName}
          </p>
        )}
      </div>
    </Link>
  );
}

export default function CourseCatalogPage() {
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const [level, setLevel] = useState('');

  const { data: categories } = useQuery<string[]>({
    queryKey: ['courses', 'categories'],
    queryFn: studentApi.categories,
    staleTime: 5 * 60_000,
  });

  const { data, isPending } = useQuery<CourseCard[]>({
    queryKey: ['courses', { search, category, level }],
    queryFn: () => studentApi.courses({ search, category, level }),
  });

  return (
    <>
      <Seo
        title="Course catalogue"
        description="Browse courses and enrol to work towards a certification."
        path="/student/courses"
        noIndex
      />

      <div className="px-4 py-6 sm:px-6 sm:py-8">
        <header>
          <h1 className="font-display text-2xl font-extrabold tracking-tight sm:text-3xl">
            Course catalogue
          </h1>
          <p className="mt-2 text-ink-600">
            Every course counts towards one or more certification tracks.
          </p>
        </header>

        {/* Filters ---------------------------------------------------------- */}
        <Card className="mt-6 p-4">
          <div className="flex flex-col gap-3 sm:flex-row">
            <div className="relative flex-1">
              <label htmlFor="course-search" className="sr-only">
                Search courses
              </label>
              <Search
                className="pointer-events-none absolute left-3.5 top-1/2 size-4.5 -translate-y-1/2 text-ink-400"
                aria-hidden="true"
              />
              <input
                id="course-search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search by title, topic or category"
                className="block w-full rounded-xl border-0 bg-surface py-2.5 pl-10 pr-3 text-sm text-ink-900 ring-1 ring-inset ring-ink-200 transition placeholder:text-ink-400 focus:ring-2 focus:ring-inset focus:ring-brand-500"
              />
            </div>

            <div className="flex gap-3">
              <div>
                <label htmlFor="course-category" className="sr-only">
                  Category
                </label>
                <select
                  id="course-category"
                  value={category}
                  onChange={(event) => setCategory(event.target.value)}
                  className="rounded-xl border-0 bg-surface py-2.5 pl-3 pr-8 text-sm text-ink-900 ring-1 ring-inset ring-ink-200 focus:ring-2 focus:ring-inset focus:ring-brand-500"
                >
                  <option value="">All categories</option>
                  {categories?.map((item) => (
                    <option key={item} value={item}>
                      {item}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="course-level" className="sr-only">
                  Level
                </label>
                <select
                  id="course-level"
                  value={level}
                  onChange={(event) => setLevel(event.target.value)}
                  className="rounded-xl border-0 bg-surface py-2.5 pl-3 pr-8 text-sm text-ink-900 ring-1 ring-inset ring-ink-200 focus:ring-2 focus:ring-inset focus:ring-brand-500"
                >
                  {LEVELS.map((item) => (
                    <option key={item.value} value={item.value}>
                      {item.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        </Card>

        {/* Results ---------------------------------------------------------- */}
        <div className="mt-6">
          {isPending ? (
            <SkeletonCards count={6} />
          ) : data && data.length > 0 ? (
            <>
              <p className="mb-4 text-sm text-ink-500" aria-live="polite">
                {data.length} course{data.length === 1 ? '' : 's'}
              </p>
              <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                {data.map((course) => (
                  <CourseTile key={course.id} course={course} />
                ))}
              </div>
            </>
          ) : (
            <EmptyState
              icon={<Search className="size-6" />}
              title="No courses match those filters"
              description="Try a different search term, or clear the category and level filters."
            />
          )}
        </div>
      </div>
    </>
  );
}
