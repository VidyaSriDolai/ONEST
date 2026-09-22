import { lazy, Suspense } from 'react';
import { Route, Routes } from 'react-router-dom';
import { ROLES } from '@skillseal/shared';
import { PublicLayout } from '@/components/layout/PublicLayout';
import { PortalShell } from '@/components/layout/PortalShell';
import { ProtectedRoute, PublicOnlyRoute } from '@/features/auth/route-guards';
import { Logo } from '@/components/ui/Logo';

/**
 * Route-level code splitting. The landing page ships on its own, so a
 * first-time visitor never downloads the portals they cannot see.
 */
const LandingPage = lazy(() => import('@/pages/LandingPage'));
const VerifyPage = lazy(() => import('@/pages/VerifyPage'));
const NotFoundPage = lazy(() => import('@/pages/NotFoundPage'));
const PortalNotFoundPage = lazy(() => import('@/pages/PortalNotFoundPage'));

const LoginPage = lazy(() => import('@/features/auth/LoginPage'));
const AdminLoginPage = lazy(() => import('@/features/auth/AdminLoginPage'));
const RegisterPage = lazy(() => import('@/features/auth/RegisterPage'));
const ForgotPasswordPage = lazy(() => import('@/features/auth/ForgotPasswordPage'));

// Student portal (spec screens 5-13)
const StudentDashboardPage = lazy(() => import('@/features/student/StudentDashboardPage'));
const CourseCatalogPage = lazy(() => import('@/features/student/CourseCatalogPage'));
const CourseDetailPage = lazy(() => import('@/features/student/CourseDetailPage'));
const LearnPage = lazy(() => import('@/features/student/LearnPage'));
const ContinueLearningPage = lazy(() => import('@/features/student/StudentLearningPage'));
const AssessmentHubPage = lazy(() =>
  import('@/features/student/StudentLearningPage').then((m) => ({ default: m.AssessmentHubPage })),
);
const LatestResultPage = lazy(() =>
  import('@/features/student/StudentLearningPage').then((m) => ({ default: m.LatestResultPage })),
);
const CertificateHubPage = lazy(() =>
  import('@/features/student/StudentLearningPage').then((m) => ({ default: m.CertificateHubPage })),
);
const AssessmentPage = lazy(() => import('@/features/student/AssessmentPage'));
const ResultPage = lazy(() => import('@/features/student/ResultPage'));
const CertificationsPage = lazy(() => import('@/features/student/CertificationsPage'));
const CertificatePage = lazy(() => import('@/features/certificates/CertificatePage'));
const ProfilePage = lazy(() => import('@/features/student/ProfilePage'));

// Provider portal (spec screens 14-18)
const ProviderDashboardPage = lazy(() => import('@/features/provider/ProviderDashboardPage'));
const CourseManagementPage = lazy(() => import('@/features/provider/CourseManagementPage'));
const AssessmentBuilderPage = lazy(() => import('@/features/provider/AssessmentBuilderPage'));
const LearnersPage = lazy(() => import('@/features/provider/LearnersPage'));
const TracksPage = lazy(() => import('@/features/provider/TracksPage'));

// Employer portal (spec screens 19-20)
const HrVerifyPage = lazy(() => import('@/features/verification/HrVerifyPage'));
const HrHistoryPage = lazy(() => import('@/features/verification/HrHistoryPage'));

// Admin portal (spec screens 21-24)
const AdminDashboardPage = lazy(() => import('@/features/admin/AdminDashboardPage'));
const UsersPage = lazy(() => import('@/features/admin/UsersPage'));
const AuditPage = lazy(() => import('@/features/admin/AuditPage'));
const ReportsPage = lazy(() => import('@/features/admin/ReportsPage'));

function RouteFallback() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <Logo showWordmark={false} className="animate-pulse" />
      <span className="sr-only">Loading…</span>
    </div>
  );
}

export default function App() {
  return (
    <Suspense fallback={<RouteFallback />}>
      <Routes>
        {/* Public marketing and verification ------------------------------ */}
        <Route element={<PublicLayout />}>
          <Route index element={<LandingPage />} />
          {/* The :certificateId form is what a certificate's QR code points at. */}
          <Route path="verify" element={<VerifyPage />} />
          <Route path="verify/:certificateId" element={<VerifyPage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Route>

        {/* Credential pages: redirect away if already signed in ----------- */}
        <Route element={<PublicOnlyRoute />}>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          {/* Staff entry point: unlinked, noindex, excluded by robots.txt. */}
          <Route path="/admin/login" element={<AdminLoginPage />} />
        </Route>

        {/* Learner portal -------------------------------------------------- */}
        <Route element={<ProtectedRoute allow={[ROLES.STUDENT]} />}>
          <Route element={<PortalShell />}>
            <Route path="/student/dashboard" element={<StudentDashboardPage />} />
            <Route path="/student/courses" element={<CourseCatalogPage />} />
            <Route path="/student/courses/:slug" element={<CourseDetailPage />} />
            <Route path="/student/learn" element={<ContinueLearningPage />} />
            <Route path="/student/learn/:slug" element={<LearnPage />} />
            <Route path="/student/assessment" element={<AssessmentHubPage />} />
            <Route path="/student/assessment/:assessmentId" element={<AssessmentPage />} />
            <Route path="/student/result" element={<LatestResultPage />} />
            <Route path="/student/result/:attemptId" element={<ResultPage />} />
            <Route path="/student/certificate" element={<CertificateHubPage />} />
            <Route path="/student/certifications" element={<CertificationsPage />} />
            <Route path="/student/certificates/:certificateId" element={<CertificatePage />} />
            <Route path="/student/profile" element={<ProfilePage />} />
            {/* Scoped to /student/* so it cannot swallow other portals' routes. */}
            <Route path="/student/*" element={<PortalNotFoundPage />} />
          </Route>
        </Route>

        {/* Training provider portal ---------------------------------------- */}
        <Route element={<ProtectedRoute allow={[ROLES.COMPANY]} />}>
          <Route element={<PortalShell />}>
            <Route path="/company/dashboard" element={<ProviderDashboardPage />} />
            <Route path="/company/courses" element={<CourseManagementPage />} />
            <Route path="/company/assessments" element={<AssessmentBuilderPage />} />
            <Route path="/company/learners" element={<LearnersPage />} />
            <Route path="/company/certifications" element={<TracksPage />} />
            <Route path="/company/*" element={<PortalNotFoundPage />} />
          </Route>
        </Route>

        {/* Employer portal -------------------------------------------------- */}
        <Route element={<ProtectedRoute allow={[ROLES.HR]} />}>
          <Route element={<PortalShell />}>
            <Route path="/hr/verify" element={<HrVerifyPage />} />
            <Route path="/hr/history" element={<HrHistoryPage />} />
            <Route path="/hr/*" element={<PortalNotFoundPage />} />
          </Route>
        </Route>

        {/* Admin portal ----------------------------------------------------- */}
        <Route element={<ProtectedRoute allow={[ROLES.ADMIN]} />}>
          <Route element={<PortalShell />}>
            <Route path="/admin/dashboard" element={<AdminDashboardPage />} />
            <Route path="/admin/users" element={<UsersPage />} />
            <Route path="/admin/audit" element={<AuditPage />} />
            <Route path="/admin/reports" element={<ReportsPage />} />
            <Route path="/admin/*" element={<PortalNotFoundPage />} />
          </Route>
        </Route>
      </Routes>
    </Suspense>
  );
}
