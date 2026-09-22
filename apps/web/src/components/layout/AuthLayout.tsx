import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, BadgeCheck, Quote, ShieldCheck, Zap } from 'lucide-react';
import { BRAND } from '@skillseal/shared';
import { Logo } from '@/components/ui/Logo';

const HIGHLIGHTS = [
  { icon: ShieldCheck, text: 'Tamper-evident, cryptographically signed certificates' },
  { icon: Zap, text: 'Verified by any employer in under a second' },
  { icon: BadgeCheck, text: 'Skills mapped to NSQF levels and SFIA definitions' },
];

export interface AuthLayoutProps {
  title: string;
  subtitle: ReactNode;
  children: ReactNode;
  /** Secondary action rendered under the form, e.g. "Already have an account?" */
  footer?: ReactNode;
}

/**
 * Split-screen shell for the credential pages. The branded panel is decorative
 * and collapses away below `lg`, so small screens get the form immediately
 * rather than scrolling past artwork.
 */
export function AuthLayout({ title, subtitle, children, footer }: AuthLayoutProps) {
  return (
    <div className="flex min-h-dvh flex-col lg:grid lg:grid-cols-2">
      {/* Form side */}
      <div className="flex flex-1 flex-col px-4 py-6 sm:px-6 lg:px-8 lg:py-10">
        <div className="flex items-center justify-between gap-4">
          <Link to="/" className="rounded-lg" aria-label={BRAND.name + ' home'}>
            <Logo />
          </Link>
          <Link
            to="/"
            className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1 text-sm font-medium text-ink-500 transition hover:text-ink-900"
          >
            <ArrowLeft className="size-4" aria-hidden="true" />
            Back to site
          </Link>
        </div>

        <main className="flex flex-1 items-center justify-center py-8 sm:py-12">
          <div className="w-full max-w-md">
            <header>
              <h1 className="font-display text-2xl font-extrabold tracking-tight sm:text-3xl">
                {title}
              </h1>
              <p className="mt-2 text-[15px] leading-relaxed text-ink-600">{subtitle}</p>
            </header>

            <div className="mt-8">{children}</div>

            {footer && <div className="mt-8">{footer}</div>}
          </div>
        </main>
      </div>

      {/* Brand side */}
      <aside
        aria-hidden="true"
        className="relative hidden overflow-hidden bg-brand-950 lg:flex lg:flex-col lg:justify-between lg:p-12"
      >
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute -right-24 -top-24 size-[30rem] rounded-full bg-brand-600/30 blur-3xl" />
          <div className="absolute -bottom-32 -left-20 size-[26rem] rounded-full bg-brand-500/20 blur-3xl" />
          <svg className="absolute inset-0 size-full opacity-[0.12]">
            <defs>
              <pattern id="auth-grid" width="48" height="48" patternUnits="userSpaceOnUse">
                <path d="M48 0H0v48" fill="none" stroke="white" strokeWidth="0.5" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#auth-grid)" />
          </svg>
        </div>

        <div className="relative">
          <p className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3.5 py-1.5 text-xs font-semibold text-brand-100 ring-1 ring-inset ring-white/15">
            <span className="size-1.5 rounded-full bg-valid-500" />
            Connected to the ONEST network
          </p>
        </div>

        <div className="relative">
          {/* Certificate mock: what the product actually produces. */}
          <div className="max-w-md rounded-2xl bg-white/[0.07] p-6 ring-1 ring-inset ring-white/15 backdrop-blur">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-brand-200">
                  Certificate of completion
                </p>
                <p className="mt-2 font-display text-xl font-bold text-white">
                  Full Stack Developer
                </p>
                <p className="mt-1 text-sm text-indigo-200/80">Ananya Rao · Infosys Springboard</p>
              </div>
              <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-valid-500/20 ring-1 ring-inset ring-valid-500/40">
                <svg viewBox="0 0 24 24" className="size-6" fill="none">
                  <path
                    d="m5 12.5 4.5 4.5L19 7"
                    stroke="#10b981"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeDasharray="48"
                    className="animate-draw-check"
                  />
                </svg>
              </span>
            </div>

            <div className="mt-5 flex flex-wrap gap-1.5">
              {['React', 'Node.js', 'PostgreSQL', 'REST APIs'].map((skill) => (
                <span
                  key={skill}
                  className="rounded-full bg-white/10 px-2.5 py-1 text-[11px] font-medium text-brand-100"
                >
                  {skill}
                </span>
              ))}
            </div>

            <div className="mt-5 flex items-center justify-between border-t border-white/10 pt-4">
              <span className="font-mono text-[11px] tracking-wide text-indigo-200/70">
                SS-2026-4F8A-21D9
              </span>
              <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-valid-400">
                <BadgeCheck className="size-3.5" />
                Verified
              </span>
            </div>
          </div>

          <figure className="mt-10 max-w-md">
            <Quote className="size-6 text-brand-400" />
            <blockquote className="mt-3 font-display text-lg font-semibold leading-relaxed text-white">
              {BRAND.tagline}
            </blockquote>
          </figure>
        </div>

        <ul className="relative space-y-3">
          {HIGHLIGHTS.map((item) => (
            <li key={item.text} className="flex items-start gap-3 text-sm text-indigo-100/80">
              <item.icon className="mt-0.5 size-4.5 shrink-0 text-brand-300" />
              {item.text}
            </li>
          ))}
        </ul>
      </aside>
    </div>
  );
}
