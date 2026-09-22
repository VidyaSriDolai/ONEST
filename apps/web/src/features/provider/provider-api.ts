import { api } from '@/lib/api-client';

export interface ProviderDashboard {
  stats: {
    courses: number;
    publishedCourses: number;
    learners: number;
    completionRate: number;
    certificatesIssued: number;
  };
  enrollmentsOverTime: Array<{ month: string; count: number }>;
  completionByCourse: Array<{ course: string; enrolled: number; completed: number }>;
}

export interface ProviderCourse {
  id: string;
  slug: string;
  title: string;
  category: string;
  level: string;
  isPublished: boolean;
  moduleCount: number;
  enrolledCount: number;
  completedCount: number;
  hasAssessment: boolean;
  createdAt: string;
}

export interface LearnerRow {
  userId: string;
  fullName: string;
  email: string;
  courseTitle: string;
  courseSlug: string;
  status: string;
  progressPercent: number;
  bestScore: number | null;
  enrolledAt: string;
}

export interface IssuedCertificateRow {
  id: string;
  certificateId: string;
  holderName: string;
  trackName: string;
  status: string;
  issuedAt: string;
  expiresAt: string | null;
  revokedReason: string | null;
}

export interface TrackSummary {
  id: string;
  slug: string;
  name: string;
  nsqfLevel: number | null;
  minimumScore: number;
  courseCount: number;
  skillCount: number;
  certificatesIssued: number;
  isActive: boolean;
}

export interface AssessmentDraft {
  courseId: string;
  title: string;
  passingScore: number;
  timeLimitMinutes: number;
  maxAttempts: number;
  publish: boolean;
  questions: Array<{
    text: string;
    marks: number;
    options: Array<{ text: string; isCorrect: boolean }>;
  }>;
}

export interface CourseDraft {
  title: string;
  description: string;
  category: string;
  level: string;
  durationHours: number;
  modules: Array<{ title: string; content: string; durationMinutes: number }>;
  prerequisiteIds: string[];
  skillIds: string[];
  publish: boolean;
}

export const providerApi = {
  dashboard: () => api.get<ProviderDashboard>('/api/provider/dashboard'),
  courses: () => api.get<ProviderCourse[]>('/api/provider/courses'),
  createCourse: (draft: CourseDraft) =>
    api.post<{ id: string; slug: string }>('/api/provider/courses', draft),
  setPublished: (courseId: string, isPublished: boolean) =>
    api.patch<{ updated: boolean }>('/api/provider/courses/' + courseId + '/published', {
      isPublished,
    }),
  learners: (courseSlug?: string) =>
    api.get<LearnerRow[]>('/api/provider/learners' + (courseSlug ? '?course=' + courseSlug : '')),
  certificates: () => api.get<IssuedCertificateRow[]>('/api/provider/certificates'),
  revokeCertificate: (certificateId: string, reason: string) =>
    api.post<{ revoked: boolean }>('/api/provider/certificates/' + certificateId + '/revoke', {
      reason,
    }),
  tracks: () => api.get<TrackSummary[]>('/api/provider/tracks'),
  skills: () => api.get<Array<{ id: string; name: string }>>('/api/provider/skills'),
  assessmentFor: (courseId: string) =>
    api.get<AssessmentDraft | null>('/api/provider/assessments/' + courseId),
  saveAssessment: (draft: AssessmentDraft) =>
    api.post<{ id: string }>('/api/provider/assessments', draft),
};
