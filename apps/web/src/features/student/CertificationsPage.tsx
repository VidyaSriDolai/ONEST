import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  Award,
  BadgeCheck,
  Check,
  ChevronRight,
  Circle,
  ExternalLink,
  Sparkles,
} from 'lucide-react';
import { Seo } from '@/components/seo/Seo';
import { Button } from '@/components/ui/Button';
import {
  Badge,
  Card,
  EmptyState,
  ProgressBar,
  Skeleton,
  Stepper,
  type StepperStep,
} from '@/components/ui/primitives';
import { studentApi, type CertificateSummary, type TrackProgress } from './student-api';
import { cn } from '@/lib/cn';

function buildSteps(track: TrackProgress): StepperStep[] {
  const hasCertificate = track.certificateId !== null;

  // Holding the certificate means every earlier step was cleared at the time
  // it was issued, even if the track's requirements have since changed. Without
  // this cascade the stepper reads absurdly: "Certificate ✓" sitting after
  // "Courses ○".
  const coursesDone = hasCertificate || track.requirements.every((r) => r.courseCompleted);
  const assessmentsDone = hasCertificate || track.requirements.every((r) => r.assessmentPassed);
  const eligible = hasCertificate || track.eligible;

  const state = (done: boolean, isCurrent: boolean): StepperStep['state'] =>
    done ? 'done' : isCurrent ? 'current' : 'todo';

  return [
    { label: 'Courses', state: state(coursesDone, !coursesDone) },
    { label: 'Assessments', state: state(assessmentsDone, coursesDone && !assessmentsDone) },
    { label: 'Skills', state: state(assessmentsDone, false) },
    { label: 'Eligible', state: state(eligible, assessmentsDone && !eligible) },
    { label: 'Certificate', state: state(hasCertificate, eligible && !hasCertificate) },
  ];
}

function TrackCard({ track }: { track: TrackProgress }) {
  return (
    <Card className="overflow-hidden">
      <div className="border-b border-ink-200 p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="font-display text-lg font-bold text-ink-900">{track.name}</h2>
              {track.nsqfLevel !== null && (
                <Badge tone="neutral">NSQF Level {track.nsqfLevel}</Badge>
              )}
              {track.eligible && !track.certificateId && (
                <Badge tone="valid">
                  <Sparkles className="size-3" aria-hidden="true" />
                  Eligible
                </Badge>
              )}
              {track.certificateId && (
                <Badge tone="valid">
                  <BadgeCheck className="size-3" aria-hidden="true" />
                  Certified
                </Badge>
              )}
            </div>
            <p className="mt-1.5 text-sm leading-relaxed text-ink-600">{track.description}</p>
            <p className="mt-1.5 text-xs text-ink-500">Issued by {track.issuerName}</p>
          </div>

          {track.certificateId && (
            <Link to={'/student/certificates/' + track.certificateId}>
              <Button size="sm">
                View certificate
                <ChevronRight className="size-4" aria-hidden="true" />
              </Button>
            </Link>
          )}
        </div>

        <div className="mt-4">
          <div className="flex items-center justify-between text-sm">
            <span className="font-medium text-ink-700">
              {track.coursesCompleted} of {track.coursesTotal} courses done
            </span>
            <span className="font-semibold text-ink-900">{track.percentComplete}%</span>
          </div>
          <ProgressBar
            value={track.percentComplete}
            className="mt-2"
            tone={track.eligible ? 'valid' : 'brand'}
            label={track.name + ' progress'}
          />
        </div>

        <div className="mt-5 overflow-x-auto pb-1">
          <Stepper steps={buildSteps(track)} />
        </div>
      </div>

      {/* Requirement checklist ------------------------------------------- */}
      <div className="p-5">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-ink-500">
          Requirements
        </h3>
        <ul className="mt-3 space-y-2">
          {track.requirements.map((requirement) => {
            const complete = requirement.courseCompleted && requirement.assessmentPassed;
            return (
              <li key={requirement.courseId}>
                <Link
                  to={'/student/courses/' + requirement.courseSlug}
                  className="flex items-center gap-3 rounded-xl px-3 py-2.5 ring-1 ring-inset transition hover:bg-ink-50"
                  style={{ borderColor: 'transparent' }}
                >
                  <span
                    className={cn(
                      'flex size-5 shrink-0 items-center justify-center rounded-full',
                      complete ? 'bg-valid-500 text-white' : 'bg-ink-200 text-ink-500',
                    )}
                    aria-hidden="true"
                  >
                    {complete ? (
                      <Check className="size-3" />
                    ) : (
                      <Circle className="size-2 fill-current" />
                    )}
                  </span>

                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-medium text-ink-800">
                      {requirement.courseTitle}
                    </span>
                    <span className="block text-xs text-ink-500">
                      {!requirement.enrolled
                        ? 'Not enrolled'
                        : !requirement.courseCompleted
                          ? 'Course in progress'
                          : !requirement.assessmentPassed
                            ? requirement.bestScore === null
                              ? 'Assessment not attempted'
                              : 'Best score ' +
                                requirement.bestScore +
                                '% — needs ' +
                                track.minimumScore +
                                '%'
                            : 'Complete · ' + requirement.bestScore + '%'}
                    </span>
                  </span>

                  <ChevronRight className="size-4 shrink-0 text-ink-400" aria-hidden="true" />
                </Link>
              </li>
            );
          })}
        </ul>

        {track.skills.length > 0 && (
          <div className="mt-5 border-t border-ink-200 pt-4">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-ink-500">
              Skills validated
            </h3>
            <ul className="mt-2.5 flex flex-wrap gap-2">
              {track.skills.map((skill) => (
                <li
                  key={skill}
                  className={cn(
                    'rounded-full px-2.5 py-1 text-xs font-medium',
                    track.eligible
                      ? 'bg-valid-50 text-valid-700'
                      : 'bg-ink-100 text-ink-600',
                  )}
                >
                  {skill}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </Card>
  );
}

export default function CertificationsPage() {
  const tracks = useQuery<TrackProgress[]>({
    queryKey: ['student', 'certifications'],
    queryFn: studentApi.certifications,
  });

  const certificates = useQuery<CertificateSummary[]>({
    queryKey: ['student', 'certificates'],
    queryFn: studentApi.certificates,
  });

  return (
    <>
      <Seo
        title="My certifications"
        description="Track your progress towards each certification."
        path="/student/certifications"
        noIndex
      />

      <div className="px-4 py-6 sm:px-6 sm:py-8">
        <header>
          <h1 className="font-display text-2xl font-extrabold tracking-tight sm:text-3xl">
            Certifications & skills
          </h1>
          <p className="mt-2 text-ink-600">
            What each track requires, and exactly how far along you are.
          </p>
        </header>

        {/* Earned certificates --------------------------------------------- */}
        <section className="mt-6">
          <h2 className="font-display text-lg font-bold">Certificates earned</h2>
          {certificates.isPending ? (
            <Skeleton className="mt-3 h-24 w-full rounded-2xl" />
          ) : certificates.data && certificates.data.length > 0 ? (
            <ul className="mt-3 grid gap-3 sm:grid-cols-2">
              {certificates.data.map((certificate) => (
                <li key={certificate.id}>
                  <Link
                    to={'/student/certificates/' + certificate.certificateId}
                    className="flex items-start gap-3 rounded-2xl bg-surface p-4 shadow-card ring-1 ring-ink-200 transition hover:-translate-y-0.5 hover:shadow-lifted"
                  >
                    <span
                      className={cn(
                        'flex size-10 shrink-0 items-center justify-center rounded-xl',
                        certificate.status === 'REVOKED'
                          ? 'bg-danger-50 text-danger-600'
                          : certificate.isExpired
                            ? 'bg-warn-50 text-accent-600'
                            : 'bg-valid-50 text-valid-600',
                      )}
                      aria-hidden="true"
                    >
                      <Award className="size-5" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block font-semibold text-ink-900">
                        {certificate.trackName}
                      </span>
                      <span className="mt-0.5 block font-mono text-xs text-ink-500">
                        {certificate.certificateId}
                      </span>
                      <span className="mt-1.5 block">
                        {certificate.status === 'REVOKED' ? (
                          <Badge tone="danger">Revoked</Badge>
                        ) : certificate.isExpired ? (
                          <Badge tone="accent">Expired</Badge>
                        ) : (
                          <Badge tone="valid">Active</Badge>
                        )}
                      </span>
                    </span>
                    <ExternalLink className="size-4 shrink-0 text-ink-400" aria-hidden="true" />
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <div className="mt-3">
              <EmptyState
                icon={<Award className="size-6" />}
                title="No certificates yet"
                description="Complete every course in a track and pass its assessments to earn one."
              />
            </div>
          )}
        </section>

        {/* Tracks ----------------------------------------------------------- */}
        <section className="mt-8">
          <h2 className="font-display text-lg font-bold">Certification tracks</h2>
          {tracks.isPending ? (
            <div className="mt-3 space-y-4">
              <Skeleton className="h-64 w-full rounded-2xl" />
              <Skeleton className="h-64 w-full rounded-2xl" />
            </div>
          ) : tracks.data && tracks.data.length > 0 ? (
            <div className="mt-3 space-y-5">
              {tracks.data.map((track) => (
                <TrackCard key={track.id} track={track} />
              ))}
            </div>
          ) : (
            <div className="mt-3">
              <EmptyState
                icon={<Award className="size-6" />}
                title="No tracks available"
                description="Certification tracks will appear here once a provider publishes one."
              />
            </div>
          )}
        </section>
      </div>
    </>
  );
}
