import { prisma } from '../../lib/prisma.js';
import { AppError } from '../../lib/errors.js';
import { notify } from '../notifications/notifications.service.js';

function secondsRemaining(startedAt: Date, timeLimitMinutes: number): number {
  const elapsed = (Date.now() - startedAt.getTime()) / 1000;
  return Math.max(0, Math.round(timeLimitMinutes * 60 - elapsed));
}

/** Starts a new attempt, or resumes the one already in progress. */
export async function startAttempt(userId: string, assessmentId: string) {
  const assessment = await prisma.assessment.findUnique({
    where: { id: assessmentId },
    include: {
      course: { select: { id: true, title: true } },
      questions: {
        orderBy: { orderIndex: 'asc' },
        include: { options: { orderBy: { orderIndex: 'asc' } } },
      },
    },
  });
  if (!assessment || !assessment.isPublished) {
    throw AppError.notFound('That assessment could not be found.');
  }

  const enrollment = await prisma.enrollment.findUnique({
    where: { userId_courseId: { userId, courseId: assessment.course.id } },
  });
  if (!enrollment) throw AppError.forbidden('Enrol in this course before taking the assessment.');

  const attempts = await prisma.assessmentAttempt.findMany({
    where: { assessmentId, userId },
    orderBy: { startedAt: 'desc' },
    include: { answers: true },
  });
  const submitted = attempts.filter((a) => a.submittedAt !== null);
  const inProgress = attempts.find((a) => a.submittedAt === null);

  if (!inProgress && submitted.length >= assessment.maxAttempts) {
    throw AppError.badRequest('You have used all ' + assessment.maxAttempts + ' attempts.');
  }

  const attempt =
    inProgress ??
    (await prisma.assessmentAttempt.create({
      data: { assessmentId, userId },
      include: { answers: true },
    }));

  const savedAnswers: Record<string, string> = {};
  for (const answer of attempt.answers) {
    if (answer.selectedOptionId) savedAnswers[answer.questionId] = answer.selectedOptionId;
  }

  return {
    attemptId: attempt.id,
    assessmentId: assessment.id,
    title: assessment.title,
    courseTitle: assessment.course.title,
    timeLimitMinutes: assessment.timeLimitMinutes,
    passingScore: assessment.passingScore,
    startedAt: attempt.startedAt.toISOString(),
    secondsRemaining: secondsRemaining(attempt.startedAt, assessment.timeLimitMinutes),
    attemptsUsed: submitted.length,
    maxAttempts: assessment.maxAttempts,
    questions: assessment.questions.map((question) => ({
      id: question.id,
      text: question.text,
      marks: question.marks,
      options: question.options.map((option) => ({ id: option.id, text: option.text })),
    })),
    savedAnswers,
  };
}

/** Records one answer as the learner goes, so a crash does not lose progress. */
export async function saveAnswer(
  userId: string,
  attemptId: string,
  questionId: string,
  optionId: string | null,
): Promise<void> {
  const attempt = await prisma.assessmentAttempt.findFirst({
    where: { id: attemptId, userId },
  });
  if (!attempt) throw AppError.notFound('That attempt could not be found.');
  if (attempt.submittedAt) throw AppError.badRequest('This attempt has already been submitted.');

  // Grading happens here, but the result is never returned to the client.
  const option = optionId
    ? await prisma.questionOption.findFirst({ where: { id: optionId, questionId } })
    : null;
  if (optionId && !option) throw AppError.badRequest('That option does not belong to the question.');

  await prisma.attemptAnswer.upsert({
    where: { attemptId_questionId: { attemptId, questionId } },
    update: { selectedOptionId: option?.id ?? null, isCorrect: option?.isCorrect ?? false },
    create: {
      attemptId,
      questionId,
      selectedOptionId: option?.id ?? null,
      isCorrect: option?.isCorrect ?? false,
    },
  });
}

export async function submitAttempt(userId: string, attemptId: string, autoSubmitted = false) {
  const attempt = await prisma.assessmentAttempt.findFirst({
    where: { id: attemptId, userId },
    include: {
      answers: true,
      assessment: {
        include: {
          course: { select: { id: true, title: true, slug: true } },
          questions: {
            orderBy: { orderIndex: 'asc' },
            include: { options: { orderBy: { orderIndex: 'asc' } } },
          },
        },
      },
    },
  });
  if (!attempt) throw AppError.notFound('That attempt could not be found.');

  const { assessment } = attempt;
  const answersByQuestion = new Map(attempt.answers.map((a) => [a.questionId, a]));
  const correctCount = assessment.questions.filter((q) => answersByQuestion.get(q.id)?.isCorrect).length;
  const totalQuestions = assessment.questions.length;
  const score = totalQuestions === 0 ? 0 : Math.round((correctCount / totalQuestions) * 100);
  const passed = score >= assessment.passingScore;

  // Only grade once. A resubmitted attempt returns its original result rather
  // than being re-scored, so the timer expiring mid-submit cannot double-count.
  if (!attempt.submittedAt) {
    await prisma.assessmentAttempt.update({
      where: { id: attempt.id },
      data: { submittedAt: new Date(), score, passed, autoSubmitted },
    });

    await notify(userId, {
      type: 'RESULT',
      title: passed ? 'Assessment passed' : 'Assessment not passed',
      body: passed
        ? 'You scored ' + score + '% on ' + assessment.course.title + '.'
        : 'You scored ' + score + '% on ' + assessment.course.title + '. The pass mark is ' + assessment.passingScore + '%.',
      link: '/student/result/' + attempt.id,
    });
  }

  const submittedCount = await prisma.assessmentAttempt.count({
    where: { assessmentId: assessment.id, userId, submittedAt: { not: null } },
  });

  const stored = attempt.submittedAt
    ? { score: attempt.score ?? score, passed: attempt.passed ?? passed }
    : { score, passed };

  return {
    attemptId: attempt.id,
    score: stored.score,
    passed: stored.passed,
    passingScore: assessment.passingScore,
    correctCount,
    totalQuestions,
    autoSubmitted: attempt.autoSubmitted || autoSubmitted,
    courseTitle: assessment.course.title,
    courseSlug: assessment.course.slug,
    attemptsUsed: submittedCount,
    maxAttempts: assessment.maxAttempts,
    canRetake: !stored.passed && submittedCount < assessment.maxAttempts,
    review: assessment.questions.map((question) => {
      const answer = answersByQuestion.get(question.id);
      const correct = question.options.find((o) => o.isCorrect);
      return {
        questionId: question.id,
        text: question.text,
        selectedOptionId: answer?.selectedOptionId ?? null,
        correctOptionId: correct?.id ?? '',
        isCorrect: answer?.isCorrect ?? false,
        options: question.options.map((o) => ({
          id: o.id,
          text: o.text,
          isCorrect: o.isCorrect,
        })),
      };
    }),
  };
}

/**
 * The learner's most recent submitted attempt, as a full result. Backs the
 * portal's "Latest result" page: one indexed read to find the attempt, then
 * the normal result path (which returns a submitted attempt as-is).
 */
export async function getLatestResult(userId: string) {
  const latest = await prisma.assessmentAttempt.findFirst({
    where: { userId, submittedAt: { not: null } },
    orderBy: { submittedAt: 'desc' },
    select: { id: true },
  });
  if (!latest) throw AppError.notFound('You have not taken any assessments yet.');
  return getResult(userId, latest.id);
}

export async function getResult(userId: string, attemptId: string) {
  const attempt = await prisma.assessmentAttempt.findFirst({
    where: { id: attemptId, userId },
    select: { id: true, submittedAt: true },
  });
  if (!attempt) throw AppError.notFound('That result could not be found.');
  if (!attempt.submittedAt) throw AppError.badRequest('This attempt has not been submitted yet.');
  return submitAttempt(userId, attemptId);
}
