import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { ROLE_HOME, type Role } from '@skillseal/shared';
import { Logo } from '@/components/ui/Logo';
import { useAuth } from './AuthProvider';

function BootSplash() {
  return (
    <div className="flex min-h-dvh items-center justify-center bg-surface">
      <div className="flex flex-col items-center gap-4">
        <Logo showWordmark={false} className="animate-pulse" />
        <p className="text-sm text-ink-500">Restoring your session…</p>
      </div>
    </div>
  );
}

export interface ProtectedRouteProps {
  /** When set, the signed-in user must hold one of these roles. */
  allow?: Role[];
}

/**
 * Gate for authenticated areas. Waits for the boot-time refresh to settle
 * before deciding, otherwise a reload would bounce a signed-in user to /login.
 */
export function ProtectedRoute({ allow }: ProtectedRouteProps) {
  const { user, isBootstrapping } = useAuth();
  const location = useLocation();

  if (isBootstrapping) return <BootSplash />;

  if (!user) {
    // Send them to the sign-in page that matches the area they were trying to
    // reach, and remember the destination so login can return them there.
    const signInPath = location.pathname.startsWith('/admin') ? '/admin/login' : '/login';
    return (
      <Navigate to={signInPath} replace state={{ from: location.pathname + location.search }} />
    );
  }

  if (allow && !allow.includes(user.role)) {
    return <Navigate to={ROLE_HOME[user.role]} replace />;
  }

  return <Outlet />;
}

/** Keeps a signed-in user off /login and /register. */
export function PublicOnlyRoute() {
  const { user, isBootstrapping } = useAuth();

  if (isBootstrapping) return <BootSplash />;
  if (user) return <Navigate to={ROLE_HOME[user.role]} replace />;

  return <Outlet />;
}
