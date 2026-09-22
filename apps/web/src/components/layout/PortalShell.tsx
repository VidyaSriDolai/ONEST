import { useEffect, useRef, useState } from 'react';
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  Award,
  BarChart3,
  Bell,
  Building2,
  ChartLine,
  ClipboardList,
  FileCheck2,
  KeyRound,
  LayoutDashboard,
  Library,
  LogOut,
  Menu,
  PlayCircle,
  ScrollText,
  ShieldCheck,
  Users,
  X,
} from 'lucide-react';
import { ROLES, ROLE_LABEL, type Role } from '@skillseal/shared';
import { Logo } from '@/components/ui/Logo';
import { useAuth } from '@/features/auth/AuthProvider';
import { ThemeToggle } from '@/features/theme/ThemeToggle';
import { api } from '@/lib/api-client';
import { cn } from '@/lib/cn';

interface NavItem {
  to: string;
  label: string;
  icon: typeof LayoutDashboard;
  /** Matches nested routes as well as the exact path. */
  match?: string;
}

/**
 * Per-portal navigation, mirroring the clickable template's ordering: the
 * learner's day reads top-to-bottom as dashboard → catalogue → learn →
 * assess → result → certify → view certificate → profile. Items without a
 * dedicated route in this release are omitted rather than dead-linked.
 */
const NAV_BY_ROLE: Record<Role, NavItem[]> = {
  STUDENT: [
    { to: '/student/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { to: '/student/courses', label: 'Course catalog', icon: Library, match: '/student/courses' },
    { to: '/student/learn', label: 'Continue learning', icon: PlayCircle, match: '/student/learn' },
    {
      to: '/student/assessment',
      label: 'Assessment',
      icon: ClipboardList,
      match: '/student/assessment',
    },
    { to: '/student/result', label: 'Latest result', icon: ChartLine, match: '/student/result' },
    {
      to: '/student/certifications',
      label: 'My certifications',
      icon: Award,
      match: '/student/certifications',
    },
    {
      to: '/student/certificate',
      label: 'Certificate',
      icon: FileCheck2,
      match: '/student/certificate',
    },
    { to: '/student/profile', label: 'Profile and alerts', icon: Bell, match: '/student/profile' },
  ],
  COMPANY: [
    { to: '/company/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { to: '/company/courses', label: 'Courses', icon: Library },
    { to: '/company/assessments', label: 'Assessment builder', icon: ClipboardList },
    { to: '/company/learners', label: 'Learners and results', icon: Users },
    { to: '/company/certifications', label: 'Tracks and certificates', icon: Award },
  ],
  HR: [
    { to: '/hr/verify', label: 'Verify certificate', icon: ShieldCheck },
    { to: '/hr/history', label: 'History and API keys', icon: KeyRound },
  ],
  ADMIN: [
    { to: '/admin/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { to: '/admin/users', label: 'Users and organizations', icon: Building2 },
    { to: '/admin/audit', label: 'Audit logs', icon: ScrollText },
    { to: '/admin/reports', label: 'Reports and ONEST sync', icon: BarChart3 },
  ],
};

/** Seconds between background polls of the unread-notification count. */
const BELL_POLL_MS = 60_000;

interface NotificationItem {
  id: string;
  title: string;
  body: string;
  read: boolean;
  createdAt: string;
}

/**
 * Bell + popover in the topbar, as in the template. Any signed-in role can
 * read the popover; only learners get a live unread count polled.
 */
function NotificationBell() {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  const { data } = useQuery<{ count: number }>({
    queryKey: ['notifications', 'unread'],
    queryFn: () => api.get<{ count: number }>('/api/student/notifications/unread-count'),
    enabled: user?.role === ROLES.STUDENT,
    refetchInterval: BELL_POLL_MS,
  });

  const { data: recent } = useQuery<NotificationItem[]>({
    queryKey: ['notifications', 'recent'],
    queryFn: () => api.get<NotificationItem[]>('/api/student/notifications'),
    enabled: open && user?.role === ROLES.STUDENT,
  });

  // Dismiss on outside click, as the template's document-level handler did.
  useEffect(() => {
    if (!open) return;
    function onPointerDown(event: PointerEvent) {
      if (!wrapRef.current?.contains(event.target as Node)) setOpen(false);
    }
    function onKey(event: KeyboardEvent) {
      if (event.key === 'Escape') setOpen(false);
    }
    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  if (user?.role !== ROLES.STUDENT) return null;
  const count = data?.count ?? 0;

  return (
    <div ref={wrapRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="relative flex size-10 items-center justify-center rounded-xl text-ink-600 transition hover:bg-ink-100 hover:text-ink-900"
        aria-label={count > 0 ? count + ' unread notifications' : 'Notifications'}
        aria-expanded={open}
      >
        <Bell className="size-5" aria-hidden="true" />
        {count > 0 && (
          <span className="absolute right-1 top-1 flex min-w-4.5 items-center justify-center rounded-full bg-danger-600 px-1 text-[10px] font-bold leading-4 text-white">
            {count > 9 ? '9+' : count}
          </span>
        )}
      </button>

      {open && (
        <div
          className="absolute right-0 top-12 z-50 w-80 max-w-[86vw] rounded-2xl border border-ink-200 bg-surface p-2 shadow-lifted"
          role="dialog"
          aria-label="Notifications"
        >
          <div className="flex items-center justify-between px-2 py-1.5">
            <h2 className="font-display text-sm font-bold text-ink-900">Notifications</h2>
            <Link
              to="/student/profile"
              onClick={() => setOpen(false)}
              className="text-xs font-semibold text-brand-600 hover:text-brand-700"
            >
              See all
            </Link>
          </div>
          {recent && recent.length > 0 ? (
            <ul className="space-y-0.5">
              {recent.slice(0, 4).map((n) => (
                <li key={n.id} className="flex gap-2.5 rounded-xl p-2.5 hover:bg-ink-50">
                  <span
                    aria-hidden="true"
                    className={cn(
                      'mt-1.5 size-2 shrink-0 rounded-full',
                      n.read ? 'bg-ink-200' : 'bg-brand-500',
                    )}
                  />
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-ink-900">{n.title}</p>
                    <p className="line-clamp-2 text-xs text-ink-500">{n.body}</p>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="px-2 pb-2 pt-1 text-sm text-ink-500">Nothing here yet.</p>
          )}
        </div>
      )}
    </div>
  );
}

/** Initials for the avatar chips, e.g. "Ananya Rao" → "AR". */
function initialsOf(name: string): string {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('');
}

/**
 * Shell for every authenticated portal, following the clickable template's
 * layout: a dark brand sidebar (portal label up top, user identity pinned at
 * the bottom), a slim topbar carrying the page title, and the content area.
 * On mobile the sidebar becomes a slide-over drawer.
 */
export function PortalShell() {
  const { user, logout } = useAuth();
  const location = useLocation();
  const [isOpen, setIsOpen] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);

  useEffect(() => setIsOpen(false), [location.pathname]);

  useEffect(() => {
    document.body.style.overflow = isOpen ? 'hidden' : '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  if (!user) return null;

  const nav = NAV_BY_ROLE[user.role];
  const initials = initialsOf(user.fullName);
  const showPageTitle = !location.pathname.endsWith('/dashboard');

  async function handleLogout() {
    setIsSigningOut(true);
    try {
      await logout();
    } finally {
      setIsSigningOut(false);
    }
  }

  // Rendered twice (drawer and desktop rail) so both stay in sync.
  const navList = (
    <nav className="flex flex-1 flex-col gap-1" aria-label="Portal">
      {nav.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          end={!item.match}
          className={({ isActive }) =>
            cn(
              'flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition',
              isActive || (item.match && location.pathname.startsWith(item.match))
                ? 'bg-brand-500 text-white'
                : 'text-brand-100 hover:bg-white/10 hover:text-white',
            )
          }
        >
          <item.icon className="size-4.5 shrink-0" aria-hidden="true" />
          {item.label}
        </NavLink>
      ))}
    </nav>
  );

  const sidebarBody = (
    <>
      <div className="px-3 pb-4 pt-1">
        <span className="text-xs font-semibold uppercase tracking-wider text-indigo-200/80">
          {ROLE_LABEL[user.role]}
        </span>
      </div>
      {navList}
      {/* Identity + sign-out pinned to the sidebar foot, as in the template. */}
      <div className="mt-4 flex items-center gap-2.5 border-t border-white/10 px-1 pt-4">
        <span
          className="flex size-9 shrink-0 items-center justify-center rounded-full bg-brand-500 font-display text-xs font-bold text-white"
          aria-hidden="true"
        >
          {initials}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-semibold leading-tight text-white">
            {user.fullName}
          </span>
          <span className="block truncate text-xs leading-tight text-indigo-200/80">
            {user.organizationName ?? user.email}
          </span>
        </span>
        <button
          type="button"
          onClick={handleLogout}
          disabled={isSigningOut}
          className="flex size-9 shrink-0 items-center justify-center rounded-xl text-brand-200 transition hover:bg-white/10 hover:text-white disabled:opacity-50"
          aria-label="Log out"
          title="Log out"
        >
          <LogOut className="size-4.5" aria-hidden="true" />
        </button>
      </div>
    </>
  );

  return (
    <div className="min-h-dvh bg-ink-50">
      <a href="#portal-main" className="skip-link">
        Skip to content
      </a>

      <div className="lg:grid lg:grid-cols-[16rem_1fr]">
        {/* Desktop sidebar — dark by design in both themes. ---------------- */}
        {/* Desktop sidebar — ink-950 stays dark in both themes (ink-900
            flips light in dark mode, which would hide the nav text). */}
        <aside className="sticky top-0 hidden h-dvh flex-col bg-ink-950 px-3 py-5 lg:flex">
          <Link to="/" className="mb-4 rounded-lg px-2" aria-label="SkillSeal home">
            <Logo inverted />
          </Link>
          {sidebarBody}
        </aside>

        <div className="flex min-w-0 flex-col">
          {/* Top bar -------------------------------------------------------- */}
          <header className="sticky top-0 z-40 border-b border-ink-200 bg-surface/90 backdrop-blur">
            <div className="flex h-14 items-center justify-between gap-3 px-4 sm:px-6">
              <div className="flex min-w-0 items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsOpen(true)}
                  className="flex size-10 items-center justify-center rounded-xl text-ink-700 transition hover:bg-ink-100 lg:hidden"
                  aria-label="Open menu"
                  aria-expanded={isOpen}
                >
                  <Menu className="size-5" />
                </button>
                {/* Page title lives in the topbar as a visual label (not a
                    heading: every page owns its own h1, and two h1s per page
                    is the exact axe violation the project fixed before). */}
                {showPageTitle && (
                  <p className="truncate font-display text-lg font-extrabold tracking-tight text-ink-900">
                    {nav.find(
                      (item) =>
                        location.pathname === item.to ||
                        (item.match && location.pathname.startsWith(item.match)),
                    )?.label ?? ROLE_LABEL[user.role]}
                  </p>
                )}
              </div>

              <div className="flex shrink-0 items-center gap-1.5">
                <ThemeToggle />
                <NotificationBell />
                <span
                  className="ml-1 hidden items-center gap-2.5 sm:flex"
                  title={user.fullName}
                >
                  <span
                    className="flex size-9 items-center justify-center rounded-full bg-brand-100 font-display text-xs font-bold text-brand-700"
                    aria-hidden="true"
                  >
                    {initials}
                  </span>
                  <span className="hidden md:block">
                    <span className="block text-sm font-semibold leading-tight text-ink-900">
                      {user.fullName}
                    </span>
                    {user.organizationName && (
                      <span className="block text-xs leading-tight text-ink-500">
                        {user.organizationName}
                      </span>
                    )}
                  </span>
                </span>
              </div>
            </div>
          </header>

          <main id="portal-main" className="min-w-0 flex-1">
            <Outlet />
          </main>
        </div>
      </div>

      {/* Mobile drawer ---------------------------------------------------- */}
      {isOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div
            className="absolute inset-0 bg-ink-950/60 animate-fade-in"
            onClick={() => setIsOpen(false)}
            aria-hidden="true"
          />
          <div className="absolute inset-y-0 left-0 flex w-72 max-w-[85vw] flex-col bg-ink-950 px-3 py-4 shadow-lifted">
            <div className="mb-4 flex items-center justify-between px-1">
              <Logo inverted />
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="flex size-10 items-center justify-center rounded-xl text-brand-100 transition hover:bg-white/10 hover:text-white"
                aria-label="Close menu"
              >
                <X className="size-5" />
              </button>
            </div>
            {sidebarBody}
          </div>
        </div>
      )}
    </div>
  );
}
