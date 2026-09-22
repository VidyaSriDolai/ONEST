/**
 * In-browser mock of the SkillSeal API.
 *
 * Purpose: the deployed site (Vercel) currently has no API behind it, so every
 * authenticated screen would die. When the API IS reachable this module is
 * never used. When it is not, the api-client transparently routes requests
 * here so the whole product can be demoed end-to-end — login included.
 *
 * Fidelity rules:
 *  - Same JSON envelope ({ ok, data } / { ok, error }) as the real API.
 *  - Same routes the web app calls (see the *-api.ts files under features/).
 *  - Same response shapes as those typed contracts — this file mirrors them.
 *  - Sessions are kept in-memory + sessionStorage; tokens are mock strings.
 *  - Data mutations persist for the tab session only.
 */
import type {
  ApiErrorCode,
  ApiResponse,
  AuthSession,
  LoginInput,
  PublicUser,
  RegisterInput,
  Role,
  VerificationResponse,
  VerificationResult,
} from '@skillseal/shared';
import type {
  ActiveAttempt,
  AttemptResult,
  CertificateSummary,
  CourseCard,
  CourseDetail,
  LearningView,
  NotificationView,
  StudentDashboard,
  TrackProgress,
} from '@/features/student/student-api';
import type {
  AssessmentDraft,
  IssuedCertificateRow,
  LearnerRow,
  ProviderCourse,
  ProviderDashboard,
  TrackSummary,
} from '@/features/provider/provider-api';
import type {
  AdminDashboard,
  AdminOrganizationRow,
  AdminUserRow,
  OnestSyncRow,
  PlatformReport,
} from '@/features/admin/admin-api';

export const isMockMode = () =>
  typeof window !== 'undefined' && window.sessionStorage.getItem('ss-mock-api') === '1';

export function enableMockMode(): void {
  window.sessionStorage.setItem('ss-mock-api', '1');
}

export function disableMockMode(): void {
  window.sessionStorage.removeItem('ss-mock-api');
}

/* ------------------------------------------------------------------ data -- */

interface MockUser extends PublicUser {
  password: string;
}

const ORGS: AdminOrganizationRow[] = [
  {
    id: 'org-1',
    name: 'Infosys Springboard',
    slug: 'infosys-springboard',
    kind: 'COMPANY',
    isActive: true,
    userCount: 2,
    courseCount: 4,
    certificateCount: 4,
    createdAt: '2026-01-10T09:00:00.000Z',
  },
  {
    id: 'org-2',
    name: 'Acme Technologies',
    slug: 'acme-technologies',
    kind: 'EMPLOYER',
    isActive: true,
    userCount: 1,
    courseCount: 0,
    certificateCount: 0,
    createdAt: '2026-01-12T09:00:00.000Z',
  },
];

function user(
  id: string,
  email: string,
  fullName: string,
  role: Role,
  organizationName: string | null,
  password = 'Demo@1234!',
): MockUser {
  return {
    id,
    email,
    fullName,
    role,
    organizationName,
    emailVerified: true,
    createdAt: '2026-01-15T09:00:00.000Z',
    password,
  };
}

const USERS: MockUser[] = [
  user('u-student', 'student@demo.test', 'Ananya Rao', 'STUDENT', null),
  user('u-company', 'company@demo.test', 'Rohit Sharma', 'COMPANY', 'Infosys Springboard'),
  user('u-hr', 'hr@demo.test', 'Priya Nair', 'HR', 'Acme Technologies'),
  user('u-admin', 'admin@demo.test', 'Admin User', 'ADMIN', null),
];

const ISSUER = 'Infosys Springboard';

interface MockTrack {
  id: string;
  slug: string;
  name: string;
  description: string;
  nsqfLevel: number;
  minimumScore: number;
  skills: string[];
  courseIds: string[];
}

const TRACKS: MockTrack[] = [
  {
    id: 't-fs',
    slug: 'full-stack-developer',
    name: 'Full Stack Developer',
    description: 'Design and ship production web applications end to end.',
    nsqfLevel: 6,
    minimumScore: 60,
    skills: ['React', 'Node.js', 'REST APIs', 'PostgreSQL'],
    courseIds: ['c-react', 'c-java', 'c-pg'],
  },
  {
    id: 't-cloud',
    slug: 'cloud-devops-engineer',
    name: 'Cloud & DevOps Engineer',
    description: 'Build, deploy and operate cloud-native services.',
    nsqfLevel: 6,
    minimumScore: 60,
    skills: ['Docker', 'Kubernetes', 'CI/CD', 'AWS'],
    courseIds: ['c-docker'],
  },
];

interface MockModule {
  id: string;
  title: string;
  content: string;
  orderIndex: number;
  durationMinutes: number;
}

interface MockCourse {
  id: string;
  slug: string;
  title: string;
  description: string;
  category: string;
  level: 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED';
  durationHours: number;
  rating: number;
  providerName: string;
  skills: string[];
  trackId: string;
  modules: MockModule[];
}

const COURSES: MockCourse[] = [
  {
    id: 'c-react',
    slug: 'react-fundamentals',
    title: 'React Fundamentals',
    description: 'Components, state and hooks — the foundation of modern UIs.',
    category: 'Frontend',
    level: 'BEGINNER',
    durationHours: 8,
    rating: 4.8,
    providerName: ISSUER,
    skills: ['React', 'JavaScript'],
    trackId: 't-fs',
    modules: [
      { id: 'm-r1', title: 'Thinking in components', content: 'Breaking a UI into a component tree, composing small pieces, and why props are read-only.', orderIndex: 1, durationMinutes: 45 },
      { id: 'm-r2', title: 'State and props', content: 'useState, lifting state up, and the one-way data flow that keeps renders predictable.', orderIndex: 2, durationMinutes: 50 },
      { id: 'm-r3', title: 'Hooks in practice', content: 'useEffect for synchronisation, custom hooks, and the rules that keep them correct.', orderIndex: 3, durationMinutes: 55 },
    ],
  },
  {
    id: 'c-java',
    slug: 'java-basics',
    title: 'Java Basics',
    description: 'Syntax, OOP and the collections every backend needs.',
    category: 'Backend',
    level: 'BEGINNER',
    durationHours: 10,
    rating: 4.6,
    providerName: ISSUER,
    skills: ['Java', 'OOP'],
    trackId: 't-fs',
    modules: [
      { id: 'm-j1', title: 'Types and control flow', content: 'Primitives, references, loops and the exception model.', orderIndex: 1, durationMinutes: 60 },
      { id: 'm-j2', title: 'Objects and classes', content: 'Encapsulation, inheritance and interfaces — plus the collections framework.', orderIndex: 2, durationMinutes: 70 },
    ],
  },
  {
    id: 'c-pg',
    slug: 'postgresql-essentials',
    title: 'PostgreSQL Essentials',
    description: 'Model data, write joins and index for real workloads.',
    category: 'Databases',
    level: 'INTERMEDIATE',
    durationHours: 12,
    rating: 4.7,
    providerName: ISSUER,
    skills: ['PostgreSQL', 'Data Modelling'],
    trackId: 't-fs',
    modules: [
      { id: 'm-p1', title: 'Relational modelling', content: 'Normalisation, keys and constraints that keep data honest.', orderIndex: 1, durationMinutes: 65 },
      { id: 'm-p2', title: 'Joins and aggregation', content: 'Inner and outer joins, GROUP BY, and reading query plans.', orderIndex: 2, durationMinutes: 75 },
    ],
  },
  {
    id: 'c-docker',
    slug: 'docker-for-developers',
    title: 'Docker for Developers',
    description: 'Containerise anything and ship it reproducibly.',
    category: 'DevOps',
    level: 'BEGINNER',
    durationHours: 6,
    rating: 4.9,
    providerName: ISSUER,
    skills: ['Docker', 'CI/CD'],
    trackId: 't-cloud',
    modules: [
      { id: 'm-d1', title: 'Images and layers', content: 'Dockerfiles, layer caching and building small images.', orderIndex: 1, durationMinutes: 40 },
      { id: 'm-d2', title: 'Compose for local stacks', content: 'Wiring app, database and cache together for local development.', orderIndex: 2, durationMinutes: 45 },
    ],
  },
];

const PROVIDER_SKILLS: Array<{ id: string; name: string }> = [
  ...new Set(COURSES.flatMap((c) => c.skills).concat(TRACKS.flatMap((t) => t.skills))),
].map((name, i) => ({ id: 'sk-' + (i + 1), name }));

interface MockQuestion {
  id: string;
  text: string;
  marks: number;
  options: Array<{ id: string; text: string }>;
  correctOptionId: string;
}

interface MockAssessment {
  id: string;
  courseId: string;
  title: string;
  passingScore: number;
  timeLimitMinutes: number;
  maxAttempts: number;
  questions: MockQuestion[];
}

const ASSESSMENTS: MockAssessment[] = [
  {
    id: 'a-react',
    courseId: 'c-react',
    title: 'React Fundamentals — assessment',
    passingScore: 60,
    timeLimitMinutes: 20,
    maxAttempts: 3,
    questions: [
      {
        id: 'rq1',
        text: 'Which hook manages local component state?',
        marks: 1,
        options: [
          { id: 'rq1o1', text: 'useState' },
          { id: 'rq1o2', text: 'useFetch' },
          { id: 'rq1o3', text: 'useRedux' },
          { id: 'rq1o4', text: 'useStore' },
        ],
        correctOptionId: 'rq1o1',
      },
      {
        id: 'rq2',
        text: 'Keys in lists should be…',
        marks: 1,
        options: [
          { id: 'rq2o1', text: 'Array indexes' },
          { id: 'rq2o2', text: 'Stable and unique' },
          { id: 'rq2o3', text: 'Random' },
          { id: 'rq2o4', text: 'Omitted' },
        ],
        correctOptionId: 'rq2o2',
      },
      {
        id: 'rq3',
        text: 'useEffect runs…',
        marks: 1,
        options: [
          { id: 'rq3o1', text: 'Only on mount' },
          { id: 'rq3o2', text: 'After render' },
          { id: 'rq3o3', text: 'Before render' },
          { id: 'rq3o4', text: 'Never' },
        ],
        correctOptionId: 'rq3o2',
      },
    ],
  },
  {
    id: 'a-java',
    courseId: 'c-java',
    title: 'Java Basics — assessment',
    passingScore: 60,
    timeLimitMinutes: 20,
    maxAttempts: 3,
    questions: [
      {
        id: 'jq1',
        text: 'Which keyword creates a class instance?',
        marks: 1,
        options: [
          { id: 'jq1o1', text: 'struct' },
          { id: 'jq1o2', text: 'new' },
          { id: 'jq1o3', text: 'make' },
          { id: 'jq1o4', text: 'alloc' },
        ],
        correctOptionId: 'jq1o2',
      },
      {
        id: 'jq2',
        text: 'ArrayList is…',
        marks: 1,
        options: [
          { id: 'jq2o1', text: 'Immutable' },
          { id: 'jq2o2', text: 'Resizable' },
          { id: 'jq2o3', text: 'A map' },
          { id: 'jq2o4', text: 'Thread-safe by default' },
        ],
        correctOptionId: 'jq2o2',
      },
      {
        id: 'jq3',
        text: 'Java compiles to…',
        marks: 1,
        options: [
          { id: 'jq3o1', text: 'Source' },
          { id: 'jq3o2', text: 'Machine code' },
          { id: 'jq3o3', text: 'Bytecode' },
          { id: 'jq3o4', text: 'Assembly' },
        ],
        correctOptionId: 'jq3o3',
      },
    ],
  },
];

interface CertificateRow {
  id: string;
  certificateId: string;
  holderId: string;
  holderName: string;
  trackId: string;
  trackName: string;
  skills: string[];
  score: number;
  nsqfLevel: number;
  status: 'ISSUED' | 'REVOKED';
  issuedAt: string;
  expiresAt: string | null;
  revokedAt: string | null;
  revokedReason: string | null;
  onestStatus: 'PENDING' | 'PUBLISHED' | 'FAILED';
}

const CERTIFICATES: CertificateRow[] = [
  {
    id: 'cert-1',
    certificateId: 'SS-2026-4F8A-21D9',
    holderId: 'u-student',
    holderName: 'Ananya Rao',
    trackId: 't-fs',
    trackName: 'Full Stack Developer',
    skills: ['React', 'Node.js', 'REST APIs', 'PostgreSQL'],
    score: 88,
    nsqfLevel: 6,
    status: 'ISSUED',
    issuedAt: '2026-05-19T19:16:10.114Z',
    expiresAt: '2029-05-19T19:16:10.114Z',
    revokedAt: null,
    revokedReason: null,
    onestStatus: 'PUBLISHED',
  },
  {
    id: 'cert-2',
    certificateId: 'SS-2023-7K2M-55XP',
    holderId: 'u-student',
    holderName: 'Ananya Rao',
    trackId: 't-cloud',
    trackName: 'Cloud & DevOps Engineer',
    skills: ['Docker', 'Kubernetes', 'CI/CD', 'AWS'],
    score: 79,
    nsqfLevel: 6,
    status: 'ISSUED',
    issuedAt: '2024-03-19T19:16:10.114Z',
    expiresAt: '2026-03-19T19:16:10.114Z',
    revokedAt: null,
    revokedReason: null,
    onestStatus: 'PUBLISHED',
  },
  {
    id: 'cert-3',
    certificateId: 'SS-2026-9QW3-4RT7',
    holderId: 'u-student',
    holderName: 'Ananya Rao',
    trackId: 't-fs',
    trackName: 'Full Stack Developer',
    skills: ['React', 'Node.js', 'REST APIs', 'PostgreSQL'],
    score: 72,
    nsqfLevel: 6,
    status: 'REVOKED',
    issuedAt: '2026-01-19T19:16:10.114Z',
    expiresAt: '2029-01-19T19:16:10.114Z',
    revokedAt: '2026-07-19T19:16:10.114Z',
    revokedReason: 'Issued in error — assessment result was later invalidated.',
    onestStatus: 'PUBLISHED',
  },
  {
    id: 'cert-4',
    certificateId: 'SS-2026-TMP1-8VZ2',
    holderId: 'u-student',
    holderName: 'Ananya Rao',
    trackId: 't-fs',
    trackName: 'Full Stack Developer',
    skills: ['React', 'Node.js', 'REST APIs', 'PostgreSQL', 'Kubernetes'],
    score: 95,
    nsqfLevel: 6,
    status: 'ISSUED',
    issuedAt: '2026-06-19T19:16:10.114Z',
    expiresAt: '2029-06-19T19:16:10.114Z',
    revokedAt: null,
    revokedReason: null,
    onestStatus: 'PUBLISHED',
  },
];

/** The seeded demo row whose stored data no longer matches its signature. */
const TAMPERED_ID = 'SS-2026-TMP1-8VZ2';

interface Enrollment {
  id: string;
  userId: string;
  courseId: string;
  status: 'ACTIVE' | 'COMPLETED';
  progressPercent: number;
  completedModules: string[];
  enrolledAt: string;
}

const ENROLLMENTS: Enrollment[] = [
  { id: 'en-1', userId: 'u-student', courseId: 'c-react', status: 'COMPLETED', progressPercent: 100, completedModules: ['m-r1', 'm-r2', 'm-r3'], enrolledAt: '2026-08-01T09:00:00.000Z' },
  { id: 'en-2', userId: 'u-student', courseId: 'c-java', status: 'COMPLETED', progressPercent: 100, completedModules: ['m-j1', 'm-j2'], enrolledAt: '2026-08-03T09:00:00.000Z' },
  { id: 'en-3', userId: 'u-student', courseId: 'c-pg', status: 'ACTIVE', progressPercent: 50, completedModules: ['m-p1'], enrolledAt: '2026-09-01T09:00:00.000Z' },
  { id: 'en-4', userId: 'u-student', courseId: 'c-docker', status: 'ACTIVE', progressPercent: 0, completedModules: [], enrolledAt: '2026-09-10T09:00:00.000Z' },
];

interface AttemptRow {
  id: string;
  userId: string;
  assessmentId: string;
  startedAt: string;
  timeLimitMinutes: number;
  submittedAt: string | null;
  autoSubmitted: boolean;
  answers: Record<string, string>;
  score: number;
  passed: boolean;
}

const ATTEMPTS: AttemptRow[] = [
  { id: 'at-1', userId: 'u-student', assessmentId: 'a-react', startedAt: '2026-09-19T18:56:11.461Z', timeLimitMinutes: 20, submittedAt: '2026-09-19T19:16:11.461Z', autoSubmitted: false, answers: { rq1: 'rq1o1', rq2: 'rq2o2', rq3: 'rq3o1' }, score: 67, passed: true },
  { id: 'at-2', userId: 'u-student', assessmentId: 'a-java', startedAt: '2026-09-19T09:40:00.000Z', timeLimitMinutes: 20, submittedAt: '2026-09-19T10:00:00.000Z', autoSubmitted: false, answers: { jq1: 'jq1o2', jq2: 'jq2o2', jq3: 'jq3o3' }, score: 100, passed: true },
];

const NOTIFICATIONS: NotificationView[] = [
  { id: 'n-1', type: 'CERTIFICATE', title: 'Certificate issued', body: 'Your Full Stack Developer certificate is ready to download and share.', link: '/student/certificates/SS-2026-4F8A-21D9', read: false, createdAt: '2026-09-19T19:16:11.000Z' },
  { id: 'n-2', type: 'RESULT', title: 'Assessment passed', body: 'You scored 67% on React Fundamentals — above the 60% pass mark.', link: '/student/results', read: false, createdAt: '2026-09-19T19:16:10.000Z' },
  { id: 'n-3', type: 'ELIGIBILITY', title: 'You are close to a certification', body: 'Finish PostgreSQL Essentials to complete the Full Stack Developer track.', link: '/student/certifications', read: false, createdAt: '2026-09-18T09:00:00.000Z' },
  { id: 'n-4', type: 'ENROLLMENT', title: 'Enrolled in Docker for Developers', body: 'Your seat is confirmed. The first module is ready when you are.', link: '/student/courses', read: true, createdAt: '2026-09-17T09:00:00.000Z' },
];

interface ApiKeyRow {
  id: string;
  name: string;
  keyPrefix: string;
  usageCount: number;
  lastUsedAt: string | null;
  createdAt: string;
  revokedAt: string | null;
}

const API_KEYS: ApiKeyRow[] = [
  { id: 'key-1', name: 'Bulk checker', keyPrefix: 'ssk_live_a1b2', usageCount: 42, lastUsedAt: '2026-09-18T14:02:00.000Z', createdAt: '2026-08-01T00:00:00.000Z', revokedAt: null },
];

interface VerifyHistoryRow {
  id: string;
  certificateId: string;
  result: VerificationResult;
  channel: 'PUBLIC_PAGE' | 'HR_PORTAL' | 'API';
  createdAt: string;
  verifiedById: string | null;
  holderName: string | null;
}

const VERIFY_HISTORY: VerifyHistoryRow[] = [
  { id: 'v-1', certificateId: 'SS-2026-4F8A-21D9', result: 'VALID', channel: 'HR_PORTAL', createdAt: '2026-09-18T10:12:00.000Z', verifiedById: 'u-hr', holderName: 'Ananya Rao' },
  { id: 'v-2', certificateId: 'SS-2023-7K2M-55XP', result: 'EXPIRED', channel: 'HR_PORTAL', createdAt: '2026-09-17T16:40:00.000Z', verifiedById: 'u-hr', holderName: 'Ananya Rao' },
  { id: 'v-3', certificateId: 'SS-2026-9QW3-4RT7', result: 'REVOKED', channel: 'PUBLIC_PAGE', createdAt: '2026-09-16T09:05:00.000Z', verifiedById: null, holderName: 'Ananya Rao' },
  { id: 'v-4', certificateId: 'SS-9999-00XX-00XX', result: 'NOT_FOUND', channel: 'PUBLIC_PAGE', createdAt: '2026-09-15T11:30:00.000Z', verifiedById: null, holderName: null },
];

interface AuditRow {
  id: string;
  action: string;
  actorEmail: string | null;
  entityType: string | null;
  entityId: string | null;
  ipAddress: string | null;
  metadata: string | null;
  createdAt: string;
}

const AUDIT: AuditRow[] = [
  { id: 'a-1', action: 'LOGIN', actorEmail: 'student@demo.test', entityType: 'USER', entityId: 'u-student', ipAddress: '203.0.113.7', metadata: null, createdAt: '2026-09-19T19:10:00.000Z' },
  { id: 'a-2', action: 'CERTIFICATE_ISSUED', actorEmail: 'company@demo.test', entityType: 'CERTIFICATE', entityId: 'SS-2026-4F8A-21D9', ipAddress: '198.51.100.4', metadata: '{"track":"Full Stack Developer"}', createdAt: '2026-09-19T19:16:10.000Z' },
  { id: 'a-3', action: 'LOGIN', actorEmail: 'hr@demo.test', entityType: 'USER', entityId: 'u-hr', ipAddress: '198.51.100.9', metadata: null, createdAt: '2026-09-18T10:10:00.000Z' },
  { id: 'a-4', action: 'CERTIFICATE_REVOKED', actorEmail: 'company@demo.test', entityType: 'CERTIFICATE', entityId: 'SS-2026-9QW3-4RT7', ipAddress: '198.51.100.4', metadata: '{"reason":"Issued in error"}', createdAt: '2026-09-17T12:00:00.000Z' },
  { id: 'a-5', action: 'LOGIN_FAILED', actorEmail: 'intruder@example.test', entityType: 'USER', entityId: null, ipAddress: '192.0.2.66', metadata: null, createdAt: '2026-09-16T03:22:00.000Z' },
];

/* --------------------------------------------------------------- helpers -- */

const now = () => new Date().toISOString();

/**
 * The real API keeps the refresh token in an httpOnly cookie that the browser
 * attaches to /auth/refresh automatically. The closest session-safe analogue —
 * sessionStorage, so it dies with the tab like an in-memory token — holds the
 * signed-in mock user id, letting a page reload restore the demo session.
 */
const SESSION_KEY = 'ss-mock-session';

function rememberSession(u: MockUser): void {
  window.sessionStorage.setItem(SESSION_KEY, u.id);
}

function rememberedUser(): MockUser | null {
  const id = window.sessionStorage.getItem(SESSION_KEY);
  return id ? (USERS.find((u) => u.id === id) ?? null) : null;
}

function forgetSession(): void {
  window.sessionStorage.removeItem(SESSION_KEY);
}

function publicUser(u: MockUser): PublicUser {
  const { password: _password, ...rest } = u;
  return rest;
}

function sessionFor(u: MockUser): AuthSession {
  return {
    user: publicUser(u),
    accessToken: 'mock-access-' + u.id,
    expiresIn: 900,
  };
}

function ok<T>(data: T): ApiResponse<T> {
  return { ok: true, data };
}

function fail(status: number, code: ApiErrorCode, message: string): ApiResponse<never> {
  // `status` rides along inside the envelope so mockRequest can turn it into
  // the HTTP status; the real API carries it on the response line instead.
  return { ok: false, error: { status, code, message } } as ApiResponse<never>;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

const isExpired = (c: CertificateRow): boolean => Boolean(c.expiresAt && c.expiresAt <= now());

function outcomeFor(c: CertificateRow): VerificationResult {
  if (c.certificateId === TAMPERED_ID) return 'TAMPERED';
  if (c.status === 'REVOKED') return 'REVOKED';
  if (isExpired(c)) return 'EXPIRED';
  return 'VALID';
}

function verifiedCertificate(c: CertificateRow, signatureValid: boolean) {
  return {
    certificateId: c.certificateId,
    holderName: c.holderName,
    trackName: c.trackName,
    issuerName: ISSUER,
    skills: c.skills,
    score: c.score,
    nsqfLevel: c.nsqfLevel,
    issuedAt: c.issuedAt,
    expiresAt: c.expiresAt,
    revokedAt: c.revokedAt,
    revokedReason: c.revokedReason,
    onestStatus: c.onestStatus,
    onestPublishedAt: c.onestStatus === 'PUBLISHED' ? c.issuedAt : null,
    signatureValid,
  };
}

function verificationResponse(c: CertificateRow): ApiResponse<VerificationResponse> {
  const result = outcomeFor(c);
  return ok({
    result,
    certificate: verifiedCertificate(c, result !== 'TAMPERED'),
    verifiedAt: now(),
  });
}

function recordVerify(
  certificateId: string,
  result: VerificationResult,
  channel: VerifyHistoryRow['channel'],
  verifiedById: string | null,
): void {
  const c = CERTIFICATES.find((x) => x.certificateId === certificateId);
  VERIFY_HISTORY.unshift({
    id: 'v-' + Date.now(),
    certificateId,
    result,
    channel,
    createdAt: now(),
    verifiedById,
    holderName: c?.holderName ?? null,
  });
}

function requireUser(token: string | null): MockUser {
  if (!token) throw fail(401, 'UNAUTHENTICATED', 'Sign in to continue.');
  const u = USERS.find((x) => 'mock-access-' + x.id === token);
  if (!u) throw fail(401, 'SESSION_EXPIRED', 'Your session has expired.');
  return u;
}

function requireRole(token: string | null, ...roles: Role[]): MockUser {
  const u = requireUser(token);
  if (!roles.includes(u.role)) throw fail(403, 'FORBIDDEN', 'You do not have access to this area.');
  return u;
}

function courseCard(c: MockCourse, token: string | null): CourseCard {
  const enrollment = token
    ? ENROLLMENTS.find((e) => e.userId === requireUser(token).id && e.courseId === c.id) ?? null
    : null;
  return {
    id: c.id,
    slug: c.slug,
    title: c.title,
    description: c.description,
    category: c.category,
    level: c.level,
    durationHours: c.durationHours,
    rating: c.rating,
    providerName: c.providerName,
    skills: c.skills,
    moduleCount: c.modules.length,
    enrollment: enrollment ? { status: enrollment.status, progressPercent: enrollment.progressPercent } : null,
  };
}

function courseDetail(c: MockCourse, token: string | null): CourseDetail {
  const card = courseCard(c, token);
  const assessment = ASSESSMENTS.find((a) => a.courseId === c.id) ?? null;
  return {
    ...card,
    modules: c.modules.map(({ id, title, orderIndex, durationMinutes }) => ({ id, title, orderIndex, durationMinutes })),
    prerequisites: [],
    canEnroll: card.enrollment === null,
    assessment: assessment
      ? { id: assessment.id, title: assessment.title, passingScore: assessment.passingScore, maxAttempts: assessment.maxAttempts }
      : null,
  };
}

function trackProgress(t: MockTrack, userId: string): TrackProgress {
  const requirements = t.courseIds.map((courseId) => {
    const course = COURSES.find((c) => c.id === courseId)!;
    const enrollment = ENROLLMENTS.find((e) => e.userId === userId && e.courseId === courseId);
    const assessment = ASSESSMENTS.find((a) => a.courseId === courseId);
    const best = assessment
      ? ATTEMPTS.filter((a) => a.userId === userId && a.assessmentId === assessment.id && a.submittedAt && a.passed)
          .reduce<number | null>((acc, a) => (acc === null || a.score > acc ? a.score : acc), null)
      : null;
    return {
      courseId,
      courseTitle: course.title,
      courseSlug: course.slug,
      enrolled: Boolean(enrollment),
      courseCompleted: enrollment?.status === 'COMPLETED',
      assessmentPassed: best !== null,
      bestScore: best,
    };
  });

  const coursesCompleted = requirements.filter((r) => r.courseCompleted).length;
  const coursesTotal = requirements.length;
  const percentComplete = coursesTotal === 0 ? 0 : Math.round((coursesCompleted / coursesTotal) * 100);
  const certificate = CERTIFICATES.find(
    (c) => c.holderId === userId && c.trackId === t.id && c.status === 'ISSUED',
  );
  const allPassed = requirements.every((r) => r.assessmentPassed);

  return {
    id: t.id,
    slug: t.slug,
    name: t.name,
    description: t.description,
    nsqfLevel: t.nsqfLevel,
    minimumScore: t.minimumScore,
    issuerName: ISSUER,
    skills: t.skills,
    requirements,
    coursesCompleted,
    coursesTotal,
    percentComplete,
    eligible: !certificate && coursesCompleted === coursesTotal && allPassed,
    certificateId: certificate?.certificateId ?? null,
  };
}

function attemptResult(a: AttemptRow): AttemptResult {
  const assessment = ASSESSMENTS.find((x) => x.id === a.assessmentId)!;
  const course = COURSES.find((c) => c.id === assessment.courseId)!;
  const submitted = ATTEMPTS.filter(
    (x) => x.userId === a.userId && x.assessmentId === a.assessmentId && x.submittedAt,
  );
  const totalQuestions = assessment.questions.length;
  const correctCount = assessment.questions.filter((q) => a.answers[q.id] === q.correctOptionId).length;

  return {
    attemptId: a.id,
    score: a.score,
    passed: a.passed,
    passingScore: assessment.passingScore,
    correctCount,
    totalQuestions,
    autoSubmitted: a.autoSubmitted,
    courseTitle: course.title,
    courseSlug: course.slug,
    attemptsUsed: submitted.length,
    maxAttempts: assessment.maxAttempts,
    canRetake: submitted.length < assessment.maxAttempts && !a.passed,
    review: assessment.questions.map((q) => {
      const selected = a.answers[q.id] ?? null;
      return {
        questionId: q.id,
        text: q.text,
        selectedOptionId: selected,
        correctOptionId: q.correctOptionId,
        isCorrect: selected === q.correctOptionId,
        options: q.options.map((o) => ({ id: o.id, text: o.text, isCorrect: o.id === q.correctOptionId })),
      };
    }),
  };
}

/* --------------------------------------------------------------- routing -- */

type MockHandler = (ctx: {
  method: string;
  path: string;
  query: URLSearchParams;
  body: any;
  token: string | null;
}) => ApiResponse<unknown> | Promise<ApiResponse<unknown>>;

const routes: { method: string; pattern: RegExp; handler: MockHandler }[] = [
  /* ---- auth ---- */
  {
    method: 'POST',
    pattern: /^\/api\/auth\/login$/,
    handler: ({ body }) => {
      const input = body as LoginInput;
      const u = USERS.find((x) => x.email.toLowerCase() === input.email.toLowerCase());
      if (!u || u.password !== input.password) {
        return fail(401, 'INVALID_CREDENTIALS', 'Email or password is incorrect.');
      }
      rememberSession(u);
      return ok(sessionFor(u));
    },
  },
  {
    method: 'POST',
    pattern: /^\/api\/auth\/register$/,
    handler: ({ body }) => {
      const input = body as RegisterInput;
      if (USERS.some((u) => u.email.toLowerCase() === input.email.toLowerCase())) {
        return fail(409, 'EMAIL_IN_USE', 'An account with that email already exists.');
      }
      const u = user(
        'u-' + Date.now(),
        input.email.toLowerCase(),
        input.fullName,
        input.role ?? 'STUDENT',
        input.role === 'STUDENT' ? null : input.organizationName ?? 'Demo Organisation',
        input.password,
      );
      USERS.push(u);
      rememberSession(u);
      return ok(sessionFor(u));
    },
  },
  {
    method: 'POST',
    pattern: /^\/api\/auth\/logout$/,
    handler: () => {
      forgetSession();
      return ok({ loggedOut: true });
    },
  },
  {
    method: 'GET',
    pattern: /^\/api\/auth\/me$/,
    handler: ({ token }) => ok(publicUser(requireUser(token))),
  },
  {
    method: 'POST',
    pattern: /^\/api\/auth\/refresh$/,
    handler: ({ token }) => {
      // The access token is null after a reload; the remembered session
      // stands in for the real API's refresh cookie.
      const u = USERS.find((x) => 'mock-access-' + x.id === token) ?? rememberedUser();
      if (!u) return fail(401, 'SESSION_EXPIRED', 'Your session has expired.');
      return ok(sessionFor(u));
    },
  },
  {
    method: 'POST',
    pattern: /^\/api\/auth\/forgot-password$/,
    handler: () =>
      ok({ message: 'If an account exists for that email, a reset link is on its way.' }),
  },
  {
    method: 'POST',
    pattern: /^\/api\/auth\/reset-password$/,
    handler: () => ok({ message: 'Password updated. You can sign in now.' }),
  },

  /* ---- catalogue (public) ---- */
  {
    method: 'GET',
    pattern: /^\/api\/courses\/categories$/,
    handler: () => ok([...new Set(COURSES.map((c) => c.category))]),
  },
  {
    method: 'GET',
    pattern: /^\/api\/courses$/,
    handler: ({ query, token }) => {
      let list = [...COURSES];
      const search = query.get('search')?.toLowerCase();
      if (search) {
        list = list.filter(
          (c) =>
            c.title.toLowerCase().includes(search) ||
            c.description.toLowerCase().includes(search) ||
            c.skills.some((s) => s.toLowerCase().includes(search)),
        );
      }
      const category = query.get('category');
      if (category) list = list.filter((c) => c.category === category);
      const level = query.get('level');
      if (level) list = list.filter((c) => c.level === level);
      return ok(list.map((c) => courseCard(c, token)));
    },
  },
  {
    method: 'GET',
    pattern: /^\/api\/courses\/([^/]+)$/,
    handler: ({ token, path }) => {
      const slug = path.split('/').pop()!;
      const c = COURSES.find((x) => x.slug === slug);
      if (!c) return fail(404, 'NOT_FOUND', 'Course not found.');
      return ok(courseDetail(c, token));
    },
  },

  /* ---- student ---- */
  {
    method: 'GET',
    pattern: /^\/api\/student\/dashboard$/,
    handler: ({ token }) => {
      const u = requireUser(token);
      const mine = ENROLLMENTS.filter((e) => e.userId === u.id);
      const certificates = CERTIFICATES.filter((c) => c.holderId === u.id && c.status === 'ISSUED');
      const skillsEarned = [...new Set(certificates.flatMap((c) => c.skills))];
      const continueLearning: StudentDashboard['continueLearning'] = mine
        .filter((e) => e.status === 'ACTIVE')
        .map((e) => {
          const c = COURSES.find((x) => x.id === e.courseId)!;
          return {
            courseSlug: c.slug,
            courseTitle: c.title,
            progressPercent: e.progressPercent,
            nextModuleTitle: c.modules.find((m) => !e.completedModules.includes(m.id))?.title ?? null,
          };
        });
      const tracks = TRACKS.map((t) => trackProgress(t, u.id))
        .filter((t) => t.certificateId === null)
        .sort((a, b) => b.percentComplete - a.percentComplete);
      const nearest = tracks[0];

      const dashboard: StudentDashboard = {
        stats: {
          enrolled: mine.length,
          completed: mine.filter((e) => e.status === 'COMPLETED').length,
          certificates: certificates.length,
          skills: skillsEarned.length,
        },
        skillsEarned,
        continueLearning,
        recentNotifications: NOTIFICATIONS.slice(0, 5),
        nearestTrack: nearest
          ? {
              name: nearest.name,
              percentComplete: nearest.percentComplete,
              coursesRemaining: nearest.coursesTotal - nearest.coursesCompleted,
            }
          : null,
      };
      return ok(dashboard);
    },
  },
  {
    method: 'POST',
    pattern: /^\/api\/student\/courses\/([^/]+)\/enroll$/,
    handler: ({ token, path }) => {
      const u = requireUser(token);
      const slug = path.split('/')[4];
      const c = COURSES.find((x) => x.slug === slug);
      if (!c) return fail(404, 'NOT_FOUND', 'Course not found.');
      const existing = ENROLLMENTS.find((e) => e.userId === u.id && e.courseId === c.id);
      if (existing) return ok({ enrollmentId: existing.id });
      const enrollment: Enrollment = {
        id: 'en-' + Date.now(),
        userId: u.id,
        courseId: c.id,
        status: 'ACTIVE',
        progressPercent: 0,
        completedModules: [],
        enrolledAt: now(),
      };
      ENROLLMENTS.push(enrollment);
      return ok({ enrollmentId: enrollment.id });
    },
  },
  {
    method: 'GET',
    pattern: /^\/api\/student\/learn\/([^/]+)$/,
    handler: ({ token, path }) => {
      const u = requireUser(token);
      const slug = path.split('/').pop()!;
      const c = COURSES.find((x) => x.slug === slug);
      const e = ENROLLMENTS.find((x) => x.userId === u.id && x.courseId === c?.id);
      if (!c || !e) return fail(404, 'NOT_FOUND', 'You are not enrolled in this course.');
      const assessment = ASSESSMENTS.find((a) => a.courseId === c.id) ?? null;
      const view: LearningView = {
        course: { id: c.id, slug: c.slug, title: c.title },
        enrollment: { id: e.id, status: e.status, progressPercent: e.progressPercent },
        modules: c.modules.map((m) => ({ ...m, completed: e.completedModules.includes(m.id) })),
        assessment: assessment ? { id: assessment.id, title: assessment.title, unlocked: e.status === 'COMPLETED' } : null,
      };
      return ok(view);
    },
  },
  {
    method: 'POST',
    pattern: /^\/api\/student\/learn\/([^/]+)\/complete$/,
    handler: ({ token, path, body }) => {
      const u = requireUser(token);
      const slug = path.split('/')[4];
      const c = COURSES.find((x) => x.slug === slug);
      const e = ENROLLMENTS.find((x) => x.userId === u.id && x.courseId === c?.id);
      if (!c || !e) return fail(404, 'NOT_FOUND', 'You are not enrolled in this course.');
      if (!e.completedModules.includes(body.moduleId)) e.completedModules.push(body.moduleId);
      e.progressPercent = Math.round((e.completedModules.length / c.modules.length) * 100);
      const courseCompleted = e.progressPercent === 100;
      if (courseCompleted) e.status = 'COMPLETED';
      return ok({ progressPercent: e.progressPercent, courseCompleted });
    },
  },
  {
    method: 'POST',
    pattern: /^\/api\/student\/assessments\/([^/]+)\/start$/,
    handler: ({ token, path }) => {
      const u = requireUser(token);
      const assessmentId = path.split('/')[4];
      const assessment = ASSESSMENTS.find((a) => a.id === assessmentId);
      if (!assessment) return fail(404, 'NOT_FOUND', 'Assessment not found.');
      const course = COURSES.find((c) => c.id === assessment.courseId)!;
      const attemptsUsed = ATTEMPTS.filter(
        (a) => a.userId === u.id && a.assessmentId === assessment.id && a.submittedAt,
      ).length;
      if (attemptsUsed >= assessment.maxAttempts) {
        return fail(403, 'FORBIDDEN', 'You have used all your attempts for this assessment.');
      }
      const attempt: AttemptRow = {
        id: 'at-' + Date.now(),
        userId: u.id,
        assessmentId: assessment.id,
        startedAt: now(),
        timeLimitMinutes: assessment.timeLimitMinutes,
        submittedAt: null,
        autoSubmitted: false,
        answers: {},
        score: 0,
        passed: false,
      };
      ATTEMPTS.push(attempt);
      const active: ActiveAttempt = {
        attemptId: attempt.id,
        assessmentId: assessment.id,
        title: assessment.title,
        courseTitle: course.title,
        timeLimitMinutes: assessment.timeLimitMinutes,
        passingScore: assessment.passingScore,
        startedAt: attempt.startedAt,
        secondsRemaining: assessment.timeLimitMinutes * 60,
        attemptsUsed,
        maxAttempts: assessment.maxAttempts,
        questions: assessment.questions.map((q) => ({
          id: q.id,
          text: q.text,
          marks: q.marks,
          options: q.options.map(({ id, text }) => ({ id, text })),
        })),
        savedAnswers: {},
      };
      return ok(active);
    },
  },
  {
    method: 'POST',
    pattern: /^\/api\/student\/attempts\/([^/]+)\/answer$/,
    handler: ({ token, path, body }) => {
      const u = requireUser(token);
      const a = ATTEMPTS.find((x) => x.id === path.split('/')[4] && x.userId === u.id);
      if (!a) return fail(404, 'NOT_FOUND', 'Attempt not found.');
      if (a.submittedAt) return fail(403, 'FORBIDDEN', 'That attempt was already submitted.');
      if (body.optionId) a.answers[body.questionId] = body.optionId;
      else delete a.answers[body.questionId];
      return ok({ saved: true });
    },
  },
  {
    method: 'POST',
    pattern: /^\/api\/student\/attempts\/([^/]+)\/submit$/,
    handler: ({ token, path, body }) => {
      const u = requireUser(token);
      const a = ATTEMPTS.find((x) => x.id === path.split('/')[4] && x.userId === u.id);
      if (!a) return fail(404, 'NOT_FOUND', 'Attempt not found.');
      if (a.submittedAt) return fail(403, 'FORBIDDEN', 'That attempt was already submitted.');
      const assessment = ASSESSMENTS.find((x) => x.id === a.assessmentId)!;
      const correct = assessment.questions.filter((q) => a.answers[q.id] === q.correctOptionId).length;
      a.score = Math.round((correct / assessment.questions.length) * 100);
      a.passed = a.score >= assessment.passingScore;
      a.autoSubmitted = Boolean(body.autoSubmitted);
      a.submittedAt = now();
      return ok(attemptResult(a));
    },
  },
  {
    method: 'GET',
    pattern: /^\/api\/student\/attempts\/latest\/result$/,
    handler: ({ token }) => {
      const u = requireUser(token);
      const a = ATTEMPTS.filter((x) => x.userId === u.id && x.submittedAt).sort(
        (x, y) => y.submittedAt!.localeCompare(x.submittedAt!),
      )[0];
      if (!a) return fail(404, 'NOT_FOUND', 'No attempt yet.');
      return ok(attemptResult(a));
    },
  },
  {
    method: 'GET',
    pattern: /^\/api\/student\/attempts\/([^/]+)\/result$/,
    handler: ({ token, path }) => {
      const u = requireUser(token);
      const a = ATTEMPTS.find((x) => x.id === path.split('/')[4] && x.userId === u.id);
      if (!a || !a.submittedAt) return fail(404, 'NOT_FOUND', 'Attempt not found.');
      return ok(attemptResult(a));
    },
  },
  {
    method: 'GET',
    pattern: /^\/api\/student\/certifications$/,
    handler: ({ token }) => {
      const u = requireUser(token);
      return ok(TRACKS.map((t) => trackProgress(t, u.id)));
    },
  },
  {
    method: 'GET',
    pattern: /^\/api\/student\/certificates$/,
    handler: ({ token }) => {
      const u = requireUser(token);
      const list: CertificateSummary[] = CERTIFICATES.filter((c) => c.holderId === u.id).map((c) => ({
        id: c.id,
        certificateId: c.certificateId,
        trackName: c.trackName,
        issuerName: ISSUER,
        skills: c.skills,
        score: c.score,
        status: c.status,
        isExpired: isExpired(c),
        issuedAt: c.issuedAt,
        expiresAt: c.expiresAt,
      }));
      return ok(list);
    },
  },
  {
    method: 'GET',
    pattern: /^\/api\/student\/certificates\/([^/]+)$/,
    handler: ({ token, path }) => {
      const u = requireUser(token);
      const certificateId = decodeURIComponent(path.split('/').pop()!);
      const c = CERTIFICATES.find((x) => x.holderId === u.id && x.certificateId === certificateId.toUpperCase());
      if (!c) return fail(404, 'NOT_FOUND', 'Certificate not found.');
      const t = TRACKS.find((x) => x.id === c.trackId)!;
      return ok({
        id: c.id,
        certificateId: c.certificateId,
        holderName: c.holderName,
        trackName: c.trackName,
        trackDescription: t.description,
        issuerName: ISSUER,
        nsqfLevel: c.nsqfLevel,
        skills: c.skills,
        score: c.score,
        status: c.status,
        isExpired: isExpired(c),
        issuedAt: c.issuedAt,
        expiresAt: c.expiresAt,
        revokedAt: c.revokedAt,
        revokedReason: c.revokedReason,
        onestStatus: c.onestStatus,
        signatureValid: c.certificateId !== TAMPERED_ID,
        verificationUrl: window.location.origin + '/verify/' + c.certificateId,
      });
    },
  },
  {
    method: 'GET',
    pattern: /^\/api\/student\/notifications$/,
    handler: ({ token }) => {
      requireUser(token);
      return ok([...NOTIFICATIONS]);
    },
  },
  {
    method: 'POST',
    pattern: /^\/api\/student\/notifications\/read-all$/,
    handler: ({ token }) => {
      requireUser(token);
      let marked = 0;
      NOTIFICATIONS.forEach((n) => {
        if (!n.read) {
          n.read = true;
          marked += 1;
        }
      });
      return ok({ marked });
    },
  },
  {
    method: 'POST',
    pattern: /^\/api\/student\/notifications\/([^/]+)\/read$/,
    handler: ({ token, path }) => {
      requireUser(token);
      const id = path.split('/')[4];
      const n = NOTIFICATIONS.find((x) => x.id === id);
      if (n) n.read = true;
      return ok({ read: true });
    },
  },

  /* ---- public verification ---- */
  {
    method: 'GET',
    pattern: /^\/api\/verify\/([^/]+)$/,
    handler: ({ path, query }) => {
      const certificateId = decodeURIComponent(path.split('/').pop()!);
      const channel = (query.get('channel') ?? 'PUBLIC_PAGE') as VerifyHistoryRow['channel'];
      const c = CERTIFICATES.find((x) => x.certificateId === certificateId.toUpperCase());
      if (!c) {
        recordVerify(certificateId.toUpperCase(), 'NOT_FOUND', channel, null);
        return ok({ result: 'NOT_FOUND', certificate: null, verifiedAt: now() });
      }
      recordVerify(c.certificateId, outcomeFor(c), channel, null);
      return verificationResponse(c);
    },
  },

  /* ---- HR ---- */
  {
    method: 'POST',
    pattern: /^\/api\/hr\/verify$/,
    handler: ({ token, body }) => {
      const u = requireRole(token, 'HR', 'ADMIN');
      const certificateId = String(body.certificateId ?? '').toUpperCase();
      const c = CERTIFICATES.find((x) => x.certificateId === certificateId);
      if (!c) {
        recordVerify(certificateId, 'NOT_FOUND', 'HR_PORTAL', u.id);
        return ok({ result: 'NOT_FOUND', certificate: null, verifiedAt: now() });
      }
      recordVerify(c.certificateId, outcomeFor(c), 'HR_PORTAL', u.id);
      return verificationResponse(c);
    },
  },
  {
    method: 'GET',
    pattern: /^\/api\/hr\/verify\/history$/,
    handler: ({ token, query }) => {
      const u = requireRole(token, 'HR', 'ADMIN');
      const limit = Number(query.get('limit') ?? 50);
      return ok(VERIFY_HISTORY.filter((r) => r.verifiedById === u.id).slice(0, limit));
    },
  },
  {
    method: 'GET',
    pattern: /^\/api\/hr\/api-keys$/,
    handler: ({ token }) => {
      requireRole(token, 'HR', 'ADMIN');
      return ok([...API_KEYS]);
    },
  },
  {
    method: 'POST',
    pattern: /^\/api\/hr\/api-keys$/,
    handler: ({ token, body }) => {
      requireRole(token, 'HR', 'ADMIN');
      const secret = 'ssk_live_' + crypto.randomUUID().replace(/-/g, '');
      const key: ApiKeyRow = {
        id: 'key-' + Date.now(),
        name: String(body.name ?? 'Untitled key'),
        keyPrefix: secret.slice(0, 16),
        usageCount: 0,
        lastUsedAt: null,
        createdAt: now(),
        revokedAt: null,
      };
      API_KEYS.unshift(key);
      return ok({ ...key, plaintextKey: secret });
    },
  },
  {
    method: 'DELETE',
    pattern: /^\/api\/hr\/api-keys\/([^/]+)$/,
    handler: ({ token, path }) => {
      requireRole(token, 'HR', 'ADMIN');
      const id = path.split('/').pop()!;
      const key = API_KEYS.find((k) => k.id === id);
      if (key && !key.revokedAt) key.revokedAt = now();
      return ok({ revoked: true });
    },
  },

  /* ---- provider ---- */
  {
    method: 'GET',
    pattern: /^\/api\/provider\/dashboard$/,
    handler: ({ token }) => {
      requireRole(token, 'COMPANY', 'ADMIN');
      const learners = new Set(ENROLLMENTS.map((e) => e.userId)).size;
      const completed = ENROLLMENTS.filter((e) => e.status === 'COMPLETED').length;
      const dashboard: ProviderDashboard = {
        stats: {
          courses: COURSES.length,
          publishedCourses: COURSES.length,
          learners,
          completionRate: ENROLLMENTS.length === 0 ? 0 : Math.round((completed / ENROLLMENTS.length) * 100),
          certificatesIssued: CERTIFICATES.length,
        },
        enrollmentsOverTime: [
          { month: 'Apr', count: 3 },
          { month: 'May', count: 5 },
          { month: 'Jun', count: 4 },
          { month: 'Jul', count: 7 },
          { month: 'Aug', count: 6 },
          { month: 'Sep', count: 4 },
        ],
        completionByCourse: COURSES.map((c) => ({
          course: c.title,
          enrolled: ENROLLMENTS.filter((e) => e.courseId === c.id).length,
          completed: ENROLLMENTS.filter((e) => e.courseId === c.id && e.status === 'COMPLETED').length,
        })),
      };
      return ok(dashboard);
    },
  },
  {
    method: 'GET',
    pattern: /^\/api\/provider\/courses$/,
    handler: ({ token }) => {
      requireRole(token, 'COMPANY', 'ADMIN');
      const list: ProviderCourse[] = COURSES.map((c) => ({
        id: c.id,
        slug: c.slug,
        title: c.title,
        category: c.category,
        level: c.level,
        isPublished: true,
        moduleCount: c.modules.length,
        enrolledCount: ENROLLMENTS.filter((e) => e.courseId === c.id).length,
        completedCount: ENROLLMENTS.filter((e) => e.courseId === c.id && e.status === 'COMPLETED').length,
        hasAssessment: ASSESSMENTS.some((a) => a.courseId === c.id),
        createdAt: '2026-07-01T09:00:00.000Z',
      }));
      return ok(list);
    },
  },
  {
    method: 'POST',
    pattern: /^\/api\/provider\/courses$/,
    handler: ({ token, body }) => {
      requireRole(token, 'COMPANY', 'ADMIN');
      const title = String(body.title ?? 'Untitled course');
      const course: MockCourse = {
        id: 'c-' + Date.now(),
        slug:
          title
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/^-|-$/g, '') + '-' + Date.now().toString(36),
        title,
        description: String(body.description ?? ''),
        category: String(body.category ?? 'General'),
        level: (['BEGINNER', 'INTERMEDIATE', 'ADVANCED'].includes(body.level) ? body.level : 'BEGINNER') as MockCourse['level'],
        durationHours: Number(body.durationHours ?? 4),
        rating: 0,
        providerName: ISSUER,
        skills: [],
        trackId: 't-fs',
        modules: (body.modules ?? []).map(
          (m: { title: string; content: string; durationMinutes: number }, i: number) => ({
            id: 'm-' + Date.now() + '-' + i,
            title: String(m.title ?? 'Module ' + (i + 1)),
            content: String(m.content ?? ''),
            orderIndex: i + 1,
            durationMinutes: Number(m.durationMinutes ?? 30),
          }),
        ),
      };
      COURSES.push(course);
      return ok({ id: course.id, slug: course.slug });
    },
  },
  {
    method: 'PATCH',
    pattern: /^\/api\/provider\/courses\/([^/]+)\/published$/,
    handler: ({ token }) => {
      requireRole(token, 'COMPANY', 'ADMIN');
      return ok({ updated: true });
    },
  },
  {
    method: 'GET',
    pattern: /^\/api\/provider\/learners$/,
    handler: ({ token, query }) => {
      requireRole(token, 'COMPANY', 'ADMIN');
      const courseSlug = query.get('course');
      const rows: LearnerRow[] = ENROLLMENTS.filter((e) => {
        if (!courseSlug) return true;
        const c = COURSES.find((x) => x.id === e.courseId);
        return c?.slug === courseSlug;
      }).map((e) => {
        const learner = USERS.find((x) => x.id === e.userId)!;
        const c = COURSES.find((x) => x.id === e.courseId)!;
        const assessment = ASSESSMENTS.find((a) => a.courseId === c.id);
        const best = assessment
          ? ATTEMPTS.filter((a) => a.userId === e.userId && a.assessmentId === assessment.id && a.submittedAt)
              .reduce<number | null>((acc, a) => (acc === null || a.score > acc ? a.score : acc), null)
          : null;
        return {
          userId: learner.id,
          fullName: learner.fullName,
          email: learner.email,
          courseTitle: c.title,
          courseSlug: c.slug,
          status: e.status,
          progressPercent: e.progressPercent,
          bestScore: best,
          enrolledAt: e.enrolledAt,
        };
      });
      return ok(rows);
    },
  },
  {
    method: 'GET',
    pattern: /^\/api\/provider\/certificates$/,
    handler: ({ token }) => {
      requireRole(token, 'COMPANY', 'ADMIN');
      const rows: IssuedCertificateRow[] = CERTIFICATES.map((c) => ({
        id: c.id,
        certificateId: c.certificateId,
        holderName: c.holderName,
        trackName: c.trackName,
        status: c.status,
        issuedAt: c.issuedAt,
        expiresAt: c.expiresAt,
        revokedReason: c.revokedReason,
      }));
      return ok(rows);
    },
  },
  {
    method: 'POST',
    pattern: /^\/api\/provider\/certificates\/([^/]+)\/revoke$/,
    handler: ({ token, path, body }) => {
      requireRole(token, 'COMPANY', 'ADMIN');
      const certificateId = decodeURIComponent(path.split('/')[4]);
      const c = CERTIFICATES.find((x) => x.certificateId === certificateId);
      if (!c) return fail(404, 'NOT_FOUND', 'Certificate not found.');
      c.status = 'REVOKED';
      c.revokedAt = now();
      c.revokedReason = String(body.reason ?? 'Revoked by issuer.');
      return ok({ revoked: true });
    },
  },
  {
    method: 'GET',
    pattern: /^\/api\/provider\/tracks$/,
    handler: ({ token }) => {
      requireRole(token, 'COMPANY', 'ADMIN');
      const rows: TrackSummary[] = TRACKS.map((t) => ({
        id: t.id,
        slug: t.slug,
        name: t.name,
        nsqfLevel: t.nsqfLevel,
        minimumScore: t.minimumScore,
        courseCount: t.courseIds.length,
        skillCount: t.skills.length,
        certificatesIssued: CERTIFICATES.filter((c) => c.trackId === t.id).length,
        isActive: true,
      }));
      return ok(rows);
    },
  },
  {
    method: 'GET',
    pattern: /^\/api\/provider\/skills$/,
    handler: ({ token }) => {
      requireRole(token, 'COMPANY', 'ADMIN');
      return ok(PROVIDER_SKILLS);
    },
  },
  {
    method: 'GET',
    pattern: /^\/api\/provider\/assessments\/([^/]+)$/,
    handler: ({ token, path }) => {
      requireRole(token, 'COMPANY', 'ADMIN');
      const courseId = path.split('/').pop()!;
      const a = ASSESSMENTS.find((x) => x.courseId === courseId);
      if (!a) return ok(null);
      const draft: AssessmentDraft = {
        courseId: a.courseId,
        title: a.title,
        passingScore: a.passingScore,
        timeLimitMinutes: a.timeLimitMinutes,
        maxAttempts: a.maxAttempts,
        publish: true,
        questions: a.questions.map((q) => ({
          text: q.text,
          marks: q.marks,
          options: q.options.map((o, i) => ({ text: o.text, isCorrect: o.id === q.correctOptionId || i === 0 && q.correctOptionId === o.id })),
        })),
      };
      return ok(draft);
    },
  },
  {
    method: 'POST',
    pattern: /^\/api\/provider\/assessments$/,
    handler: ({ token, body }) => {
      requireRole(token, 'COMPANY', 'ADMIN');
      const draft = body as AssessmentDraft;
      const existing = ASSESSMENTS.findIndex((a) => a.courseId === draft.courseId);
      const assessment: MockAssessment = {
        id: existing >= 0 ? ASSESSMENTS[existing].id : 'a-' + Date.now(),
        courseId: draft.courseId,
        title: draft.title,
        passingScore: draft.passingScore,
        timeLimitMinutes: draft.timeLimitMinutes,
        maxAttempts: draft.maxAttempts,
        questions: draft.questions.map((q, qi) => {
          const options = q.options.map((o, oi) => ({ id: 'q' + qi + 'o' + oi, text: o.text }));
          const correctIndex = Math.max(0, q.options.findIndex((o) => o.isCorrect));
          return {
            id: 'q' + qi,
            text: q.text,
            marks: q.marks,
            options,
            correctOptionId: options[correctIndex]?.id ?? options[0].id,
          };
        }),
      };
      if (existing >= 0) ASSESSMENTS[existing] = assessment;
      else ASSESSMENTS.push(assessment);
      return ok({ id: assessment.id });
    },
  },

  /* ---- admin ---- */
  {
    method: 'GET',
    pattern: /^\/api\/admin\/dashboard$/,
    handler: ({ token }) => {
      requireRole(token, 'ADMIN');
      const verificationsPerDay = lastNDays(14).map((day, i) => ({
        day,
        count: [3, 5, 2, 6, 4, 7, 5, 8, 6, 4, 7, 9, 5, 6][i % 14],
      }));
      const dashboard: AdminDashboard = {
        stats: {
          users: USERS.length,
          organizations: ORGS.length,
          courses: COURSES.length,
          certificates: CERTIFICATES.length,
          verifications: VERIFY_HISTORY.length,
        },
        usersByRole: Object.entries(
          USERS.reduce<Record<string, number>>((acc, u) => ({ ...acc, [u.role]: (acc[u.role] ?? 0) + 1 }), {}),
        ).map(([role, count]) => ({ role, count })),
        verificationsPerDay,
        certificatesPerMonth: [
          { month: 'Apr', count: 2 },
          { month: 'May', count: 4 },
          { month: 'Jun', count: 3 },
          { month: 'Jul', count: 5 },
          { month: 'Aug', count: 6 },
          { month: 'Sep', count: 3 },
        ],
        onestSummary: ['PUBLISHED', 'PENDING', 'FAILED'].map((status) => ({
          status,
          count: CERTIFICATES.filter((c) => c.onestStatus === status).length,
        })),
      };
      return ok(dashboard);
    },
  },
  {
    method: 'GET',
    pattern: /^\/api\/admin\/users$/,
    handler: ({ token, query }) => {
      requireRole(token, 'ADMIN');
      const search = query.get('search')?.toLowerCase();
      const rows: AdminUserRow[] = USERS.filter(
        (u) =>
          !search ||
          u.email.toLowerCase().includes(search) ||
          u.fullName.toLowerCase().includes(search),
      ).map((u) => ({
        id: u.id,
        fullName: u.fullName,
        email: u.email,
        role: u.role,
        organizationName: u.organizationName,
        isActive: u.emailVerified,
        lastLoginAt: u.id === 'u-student' ? '2026-09-19T19:10:00.000Z' : null,
        createdAt: u.createdAt,
      }));
      return ok(rows);
    },
  },
  {
    method: 'PATCH',
    pattern: /^\/api\/admin\/users\/([^/]+)\/active$/,
    handler: ({ token, path, body }) => {
      requireRole(token, 'ADMIN');
      const id = path.split('/')[4];
      const target = USERS.find((x) => x.id === id);
      if (!target) return fail(404, 'NOT_FOUND', 'User not found.');
      target.emailVerified = Boolean(body.isActive);
      return ok({ updated: true });
    },
  },
  {
    method: 'PATCH',
    pattern: /^\/api\/admin\/users\/([^/]+)\/role$/,
    handler: ({ token, path, body }) => {
      requireRole(token, 'ADMIN');
      const id = path.split('/')[4];
      const target = USERS.find((x) => x.id === id);
      if (!target) return fail(404, 'NOT_FOUND', 'User not found.');
      target.role = body.role as Role;
      return ok({ updated: true });
    },
  },
  {
    method: 'GET',
    pattern: /^\/api\/admin\/organizations$/,
    handler: ({ token }) => {
      requireRole(token, 'ADMIN');
      return ok(
        ORGS.map((o) => ({
          ...o,
          userCount: USERS.filter((u) => u.organizationName === o.name).length,
          courseCount: o.kind === 'COMPANY' ? COURSES.length : 0,
          certificateCount: o.kind === 'COMPANY' ? CERTIFICATES.length : 0,
        })),
      );
    },
  },
  {
    method: 'GET',
    pattern: /^\/api\/admin\/audit$/,
    handler: ({ token, query }) => {
      requireRole(token, 'ADMIN');
      const action = query.get('action');
      const from = query.get('from');
      const to = query.get('to');
      const search = query.get('search')?.toLowerCase();
      return ok(
        AUDIT.filter((row) => {
          if (action && row.action !== action) return false;
          if (from && row.createdAt < from) return false;
          if (to && row.createdAt > to + 'T23:59:59.999Z') return false;
          if (search && !JSON.stringify(row).toLowerCase().includes(search)) return false;
          return true;
        }),
      );
    },
  },
  {
    method: 'GET',
    pattern: /^\/api\/admin\/audit\/actions$/,
    handler: ({ token }) => {
      requireRole(token, 'ADMIN');
      return ok(['LOGIN', 'LOGIN_FAILED', 'CERTIFICATE_ISSUED', 'CERTIFICATE_REVOKED', 'VERIFICATION', 'ROLE_CHANGED']);
    },
  },
  {
    method: 'GET',
    pattern: /^\/api\/admin\/reports$/,
    handler: ({ token }) => {
      requireRole(token, 'ADMIN');
      const report: PlatformReport = {
        enrollment: COURSES.map((c) => {
          const enrolled = ENROLLMENTS.filter((e) => e.courseId === c.id).length;
          const completed = ENROLLMENTS.filter((e) => e.courseId === c.id && e.status === 'COMPLETED').length;
          return {
            course: c.title,
            enrolled,
            completed,
            rate: enrolled === 0 ? 0 : Math.round((completed / enrolled) * 100),
          };
        }),
        assessment: COURSES.map((c) => {
          const assessment = ASSESSMENTS.find((a) => a.courseId === c.id);
          const attempts = assessment
            ? ATTEMPTS.filter((a) => a.assessmentId === assessment.id && a.submittedAt)
            : [];
          const passed = attempts.filter((a) => a.passed);
          return {
            course: c.title,
            attempts: attempts.length,
            passed: passed.length,
            averageScore:
              attempts.length === 0
                ? 0
                : Math.round(attempts.reduce((sum, a) => sum + a.score, 0) / attempts.length),
          };
        }),
        verification: Object.entries(
          VERIFY_HISTORY.reduce<Record<string, number>>(
            (acc, r) => ({ ...acc, [r.result]: (acc[r.result] ?? 0) + 1 }),
            {},
          ),
        ).map(([result, count]) => ({ result, count })),
      };
      return ok(report);
    },
  },
  {
    method: 'GET',
    pattern: /^\/api\/admin\/onest$/,
    handler: ({ token }) => {
      requireRole(token, 'ADMIN');
      const rows: OnestSyncRow[] = CERTIFICATES.map((c) => ({
        certificateId: c.certificateId,
        holderName: c.holderName,
        trackName: c.trackName,
        onestStatus: c.onestStatus,
        onestPublishedAt: c.onestStatus === 'PUBLISHED' ? c.issuedAt : null,
        onestError: null,
      }));
      return ok(rows);
    },
  },
  {
    method: 'POST',
    pattern: /^\/api\/admin\/onest\/([^/]+)\/retry$/,
    handler: ({ token, path }) => {
      requireRole(token, 'ADMIN');
      const certificateId = decodeURIComponent(path.split('/').pop()!);
      const c = CERTIFICATES.find((x) => x.certificateId === certificateId);
      if (c) c.onestStatus = 'PUBLISHED';
      return ok({ retried: true });
    },
  },
];

/** Short day labels for the last `n` days, oldest first. */
function lastNDays(n: number): string[] {
  const fmt = new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric' });
  return Array.from({ length: n }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (n - 1 - i));
    return fmt.format(d);
  });
}

/**
 * Entry point used by the api-client. Failures carry the same envelope shape
 * as the real API so `parse()` in api-client handles both identically.
 */
export async function mockRequest(
  method: string,
  path: string,
  body: unknown,
  token: string | null,
): Promise<{ status: number; payload: ApiResponse<unknown> }> {
  await sleep(120 + Math.random() * 180); // feel real, surface loading states

  const url = new URL(path, window.location.origin);
  const route = routes.find((r) => r.method === method && r.pattern.test(url.pathname));

  if (!route) {
    return {
      status: 404,
      payload: fail(404, 'NOT_FOUND', 'No mock for ' + method + ' ' + url.pathname),
    };
  }

  try {
    const payload = await route.handler({
      method,
      path: url.pathname,
      query: url.searchParams,
      body,
      token,
    });
    if (payload.ok) {
      return { status: method === 'POST' && url.pathname.includes('/register') ? 201 : 200, payload };
    }
    const status = (payload as { error?: { status?: number } }).error?.status ?? 400;
    return { status, payload };
  } catch (err) {
    // requireUser / requireRole throw an ApiResponse-shaped failure.
    const status = (err as { error?: { status?: number } })?.error?.status ?? 401;
    return { status, payload: err as ApiResponse<never> };
  }
}
