import { useEffect, useState } from 'react';
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom';
import { Menu, X } from 'lucide-react';
import { BRAND, ROLE_HOME } from '@skillseal/shared';
import { Logo } from '@/components/ui/Logo';
import { Button } from '@/components/ui/Button';
import { useAuth } from '@/features/auth/AuthProvider';
import { ThemeToggle } from '@/features/theme/ThemeToggle';
import { cn } from '@/lib/cn';

const NAV_LINKS = [
  { label: 'How it works', href: '/#how-it-works' },
  { label: 'Tracks', href: '/#tracks' },
  { label: 'For employers', href: '/#employers' },
  { label: 'Verify', href: '/verify' },
];

function PublicHeader() {
  const [isOpen, setIsOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const { user } = useAuth();
  const location = useLocation();

  // Close the mobile drawer whenever the route changes.
  useEffect(() => setIsOpen(false), [location.pathname, location.hash]);

  // A solid background once the page scrolls, so the bar stays readable.
  useEffect(() => {
    const onScroll = () => setIsScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // Prevent the page behind the drawer from scrolling.
  useEffect(() => {
    document.body.style.overflow = isOpen ? 'hidden' : '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  return (
    <header
      className={cn(
        'sticky top-0 z-40 transition-all duration-300',
        isScrolled
          ? 'border-b border-ink-200 bg-white/85 backdrop-blur-lg'
          : 'border-b border-transparent bg-transparent',
      )}
    >
      <nav className="container-page flex h-16 items-center justify-between gap-4" aria-label="Main">
        <Link to="/" className="rounded-lg" aria-label={BRAND.name + ' home'}>
          <Logo />
        </Link>

        <ul className="hidden items-center gap-1 lg:flex">
          {NAV_LINKS.map((link) => (
            <li key={link.href}>
              <NavLink
                to={link.href}
                className="rounded-lg px-3.5 py-2 text-sm font-medium text-ink-600 transition hover:bg-ink-100 hover:text-ink-900"
              >
                {link.label}
              </NavLink>
            </li>
          ))}
        </ul>

        <div className="hidden items-center gap-2 lg:flex">
          <ThemeToggle />
          {user ? (
            <Link to={ROLE_HOME[user.role]}>
              <Button size="sm">Go to dashboard</Button>
            </Link>
          ) : (
            <>
              <Link to="/login">
                <Button variant="ghost" size="sm">
                  Sign in
                </Button>
              </Link>
              <Link to="/register">
                <Button size="sm">Get started</Button>
              </Link>
            </>
          )}
        </div>

        <button
          type="button"
          onClick={() => setIsOpen((v) => !v)}
          className="flex size-10 items-center justify-center rounded-xl text-ink-700 transition hover:bg-ink-100 lg:hidden"
          aria-expanded={isOpen}
          aria-controls="mobile-nav"
          aria-label={isOpen ? 'Close menu' : 'Open menu'}
        >
          {isOpen ? <X className="size-5" /> : <Menu className="size-5" />}
        </button>
      </nav>

      {/* Mobile drawer */}
      <div
        id="mobile-nav"
        hidden={!isOpen}
        className="border-t border-ink-200 bg-surface lg:hidden animate-fade-in"
      >
        <ul className="container-page flex flex-col gap-1 py-4">
          {NAV_LINKS.map((link) => (
            <li key={link.href}>
              <NavLink
                to={link.href}
                className="block rounded-xl px-3 py-3 text-base font-medium text-ink-700 transition hover:bg-ink-100"
              >
                {link.label}
              </NavLink>
            </li>
          ))}
          <li className="flex items-center justify-between rounded-xl px-3 py-2">
            <span className="text-base font-medium text-ink-700">Dark mode</span>
            <ThemeToggle />
          </li>
          <li className="mt-3 flex flex-col gap-2 border-t border-ink-200 pt-4">
            {user ? (
              <Link to={ROLE_HOME[user.role]}>
                <Button fullWidth size="lg">
                  Go to dashboard
                </Button>
              </Link>
            ) : (
              <>
                <Link to="/login">
                  <Button variant="secondary" fullWidth size="lg">
                    Sign in
                  </Button>
                </Link>
                <Link to="/register">
                  <Button fullWidth size="lg">
                    Get started
                  </Button>
                </Link>
              </>
            )}
          </li>
        </ul>
      </div>
    </header>
  );
}

const FOOTER_SECTIONS = [
  {
    title: 'Platform',
    links: [
      { label: 'How it works', href: '/#how-it-works' },
      { label: 'Certification tracks', href: '/#tracks' },
      { label: 'Verify a certificate', href: '/verify' },
      { label: 'Create an account', href: '/register' },
    ],
  },
  {
    title: 'For employers',
    links: [
      { label: 'Verification portal', href: '/#employers' },
      { label: 'Verification API', href: '/#employers' },
      { label: 'Bulk verification', href: '/#employers' },
    ],
  },
  {
    title: 'Standards',
    links: [
      { label: 'ONEST network', href: '/#onest' },
      { label: 'NSQF alignment', href: '/#onest' },
      { label: 'SFIA skills mapping', href: '/#onest' },
    ],
  },
];

function PublicFooter() {
  return (
    <footer className="palette-light mt-auto border-t border-ink-200 bg-ink-900 text-ink-300">
      <div className="container-page py-14">
        <div className="grid gap-10 md:grid-cols-2 lg:grid-cols-5">
          <div className="lg:col-span-2">
            <Logo inverted />
            <p className="mt-4 max-w-xs text-sm leading-relaxed text-ink-400">
              {BRAND.description}
            </p>
            <p className="mt-5 inline-flex items-center gap-2 rounded-full bg-white/5 px-3 py-1.5 text-xs font-medium text-brand-200 ring-1 ring-inset ring-white/10">
              <span className="size-1.5 rounded-full bg-valid-500" aria-hidden="true" />
              Published to the ONEST network
            </p>
          </div>

          {FOOTER_SECTIONS.map((section) => (
            <nav key={section.title} aria-label={section.title}>
              <h2 className="text-sm font-semibold text-white">{section.title}</h2>
              <ul className="mt-4 space-y-2.5">
                {section.links.map((link) => (
                  <li key={link.label}>
                    <Link
                      to={link.href}
                      className="rounded text-sm text-ink-400 transition hover:text-white"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          ))}
        </div>

        <div className="mt-12 flex flex-col gap-4 border-t border-white/10 pt-6 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs text-ink-400">
            © {new Date().getFullYear()} {BRAND.legalName}. Built for the ONEST open network.
          </p>
          <ul className="flex flex-wrap gap-x-6 gap-y-2 text-xs text-ink-400">
            <li>
              <a href={'mailto:' + BRAND.supportEmail} className="rounded transition hover:text-white">
                {BRAND.supportEmail}
              </a>
            </li>
            <li>
              <Link to="/" className="rounded transition hover:text-white">
                Privacy
              </Link>
            </li>
            <li>
              <Link to="/" className="rounded transition hover:text-white">
                Terms
              </Link>
            </li>
          </ul>
        </div>
      </div>
    </footer>
  );
}

export function PublicLayout() {
  return (
    <div className="flex min-h-dvh flex-col">
      <a href="#main" className="skip-link">
        Skip to content
      </a>
      <PublicHeader />
      <main id="main" className="flex-1">
        <Outlet />
      </main>
      <PublicFooter />
    </div>
  );
}
