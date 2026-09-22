import { api } from '@/lib/api-client';

export interface CourseCard {
  id: string;
  slug: string;
  title: string;
  description: string;
  category: string;
  level: string;
  durationHours: number;
  rating: number | null;
  providerName: string;
  skills: string[];
  moduleCount: number;
  enrollment: { status: string; progressPercent: number } | null;
}

export interface CourseDetail extends CourseCard {
  modules: Array<{ id: string; title: string; orderIndex: number; durationMinutes: number }>;
  prerequisites: Array<{ id: string; title: string; slug: string; met: boolean }>;
  canEnroll: boolean;
  assessment: { id: string; title: string; passingScore: number; maxAttempts: number } | null;
}

export interface LearningView {
  course: { id: string; slug: string; title: string };
  enrollment: { id: string; status: string; progressPercent: number };
  modules: Array<{
    id: string;
    title: string;
    content: string;
    orderIndex: number;
    durationMinutes: number;
    completed: boolean;
  }>;
  assessment: { id: string; title: string; unlocked: boolean } | null;
}

export interface ActiveAttempt {
  attemptId: string;
  assessmentId: string;
  title: string;
  courseTitle: string;
  timeLimitMinutes: number;
  passingScore: number;
  startedAt: string;
  secondsRemaining: number;
  attemptsUsed: number;
  maxAttempts: number;
  questions: Array<{
    id: string;
    text: string;
    marks: number;
    options: Array<{ id: string; text: string }>;
  }>;
  savedAnswers: Record<string, string>;
}

export interface AttemptResult {
  attemptId: string;
  score: number;
  passed: boolean;
  passingScore: number;
  correctCount: number;
  totalQuestions: number;
  autoSubmitted: boolean;
  courseTitle: string;
  courseSlug: string;
  attemptsUsed: number;
  maxAttempts: number;
  canRetake: boolean;
  review: Array<{
    questionId: string;
    text: string;
    selectedOptionId: string | null;
    correctOptionId: string;
    isCorrect: boolean;
    options: Array<{ id: string; text: string; isCorrect: boolean }>;
  }>;
}

export interface TrackProgress {
  id: string;
  slug: string;
  name: string;
  description: string;
  nsqfLevel: number | null;
  minimumScore: number;
  issuerName: string;
  skills: string[];
  requirements: Array<{
    courseId: string;
    courseTitle: string;
    courseSlug: string;
    enrolled: boolean;
    courseCompleted: boolean;
    assessmentPassed: boolean;
    bestScore: number | null;
  }>;
  coursesCompleted: number;
  coursesTotal: number;
  percentComplete: number;
  eligible: boolean;
  certificateId: string | null;
}

export interface StudentDashboard {
  stats: { enrolled: number; completed: number; certificates: number; skills: number };
  skillsEarned: string[];
  continueLearning: Array<{
    courseSlug: string;
    courseTitle: string;
    progressPercent: number;
    nextModuleTitle: string | null;
  }>;
  recentNotifications: NotificationView[];
  nearestTrack: { name: string; percentComplete: number; coursesRemaining: number } | null;
}

export interface NotificationView {
  id: string;
  type: string;
  title: string;
  body: string;
  link: string | null;
  read: boolean;
  createdAt: string;
}

export interface CertificateSummary {
  id: string;
  certificateId: string;
  trackName: string;
  issuerName: string;
  skills: string[];
  score: number | null;
  status: string;
  isExpired: boolean;
  issuedAt: string;
  expiresAt: string | null;
}

const query = (params: Record<string, string | undefined>): string => {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value) search.set(key, value);
  }
  const s = search.toString();
  return s ? '?' + s : '';
};

export const studentApi = {
  dashboard: () => api.get<StudentDashboard>('/api/student/dashboard'),

  courses: (filters: { search?: string; category?: string; level?: string } = {}) =>
    api.get<CourseCard[]>('/api/courses' + query(filters)),

  categories: () => api.get<string[]>('/api/courses/categories'),

  course: (slug: string) => api.get<CourseDetail>('/api/courses/' + slug),

  enroll: (slug: string) =>
    api.post<{ enrollmentId: string }>('/api/student/courses/' + slug + '/enroll'),

  learn: (slug: string) => api.get<LearningView>('/api/student/learn/' + slug),

  completeModule: (slug: string, moduleId: string) =>
    api.post<{ progressPercent: number; courseCompleted: boolean }>(
      '/api/student/learn/' + slug + '/complete',
      { moduleId },
    ),

  startAttempt: (assessmentId: string) =>
    api.post<ActiveAttempt>('/api/student/assessments/' + assessmentId + '/start'),

  saveAnswer: (attemptId: string, questionId: string, optionId: string | null) =>
    api.post<{ saved: boolean }>('/api/student/attempts/' + attemptId + '/answer', {
      questionId,
      optionId,
    }),

  submitAttempt: (attemptId: string, autoSubmitted = false) =>
    api.post<AttemptResult>('/api/student/attempts/' + attemptId + '/submit', { autoSubmitted }),

  result: (attemptId: string) =>
    api.get<AttemptResult>('/api/student/attempts/' + attemptId + '/result'),

  latestResult: () => api.get<AttemptResult>('/api/student/attempts/latest/result'),

  certifications: () => api.get<TrackProgress[]>('/api/student/certifications'),

  certificates: () => api.get<CertificateSummary[]>('/api/student/certificates'),

  notifications: () => api.get<NotificationView[]>('/api/student/notifications'),

  markRead: (id: string) => api.post<{ read: boolean }>('/api/student/notifications/' + id + '/read'),

  markAllRead: () => api.post<{ marked: number }>('/api/student/notifications/read-all'),
};
