import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  ArrowRight,
  BadgeCheck,
  Building2,
  ClipboardCheck,
  Code2,
  Cpu,
  Database,
  FileCheck2,
  GraduationCap,
  Layers,
  QrCode,
  Search,
  ShieldCheck,
  Sparkles,
  Workflow,
  Zap,
} from 'lucide-react';
import { BRAND } from '@skillseal/shared';
import { Seo } from '@/components/seo/Seo';
import { Button } from '@/components/ui/Button';
import { absoluteUrl } from '@/lib/site';

/* ------------------------------------------------------------------ hero -- */

/**
 * Seeded certificates covering the outcomes worth demonstrating. Remove this
 * alongside the login page's demo accounts before a production deploy.
 */
const SAMPLE_IDS = [
  { id: 'SS-2026-4F8A-21D9', label: 'Valid' },
  { id: 'SS-2023-7K2M-55XP', label: 'Expired' },
  { id: 'SS-2026-9QW3-4RT7', label: 'Revoked' },
];

function VerifyBox() {
  const navigate = useNavigate();
  const [certificateId, setCertificateId] = useState('');

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const id = certificateId.trim();
    if (id) navigate('/verify/' + encodeURIComponent(id));
  }

  return (
    <div className="rounded-2xl bg-white/95 p-5 shadow-lifted ring-1 ring-white/60 backdrop-blur sm:p-6">
      <div className="flex items-center gap-2">
        <ShieldCheck className="size-5 text-brand-600" aria-hidden="true" />
        <h2 className="font-display text-base font-bold text-ink-900">Verify a certificate</h2>
      </div>
      <p className="mt-1.5 text-sm text-ink-500">
        Paste a certificate ID or scan its QR code. No account needed.
      </p>

      <form onSubmit={handleSubmit} className="mt-4 space-y-3">
        <div className="relative">
          <label htmlFor="hero-certificate-id" className="sr-only">
            Certificate ID
          </label>
          <Search
            className="pointer-events-none absolute left-3.5 top-1/2 size-4.5 -translate-y-1/2 text-ink-400"
            aria-hidden="true"
          />
          <input
            id="hero-certificate-id"
            value={certificateId}
            onChange={(event) => setCertificateId(event.target.value)}
            placeholder="SS-2026-4F8A-21D9"
            autoComplete="off"
            spellCheck={false}
            className="block w-full rounded-xl border-0 bg-surface py-3 pl-10 pr-3 font-mono text-sm tracking-wide text-ink-900 ring-1 ring-inset ring-ink-200 transition placeholder:font-sans placeholder:tracking-normal placeholder:text-ink-400 focus:ring-2 focus:ring-inset focus:ring-brand-500"
          />
        </div>
        <Button type="submit" size="lg" fullWidth disabled={!certificateId.trim()}>
          Verify now
          <ArrowRight className="size-4" aria-hidden="true" />
        </Button>
      </form>

      <div className="mt-4 border-t border-ink-200 pt-3">
        <p className="text-xs text-ink-500">Try a sample:</p>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {SAMPLE_IDS.map((sample) => (
            <button
              key={sample.id}
              type="button"
              onClick={() => navigate('/verify/' + sample.id)}
              className="rounded-lg bg-ink-100 px-2.5 py-1 font-mono text-[11px] font-medium text-ink-700 transition hover:bg-brand-50 hover:text-brand-700"
              title={sample.label + ' certificate'}
            >
              {sample.id}
            </button>
          ))}
        </div>
      </div>

      <p className="mt-3 flex items-center justify-center gap-1.5 text-xs text-ink-500">
        <QrCode className="size-3.5" aria-hidden="true" />
        Every certificate carries a scannable QR code
      </p>
    </div>
  );
}

function Hero() {
  return (
    <section className="relative overflow-hidden bg-brand-950">
      {/* Decorative field. Hidden from assistive tech. */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-0">
        <div className="absolute -left-32 -top-32 size-[28rem] rounded-full bg-brand-600/30 blur-3xl" />
        <div className="absolute -bottom-40 right-0 size-[32rem] rounded-full bg-brand-500/20 blur-3xl" />
        <svg className="absolute inset-0 size-full opacity-[0.15]">
          <defs>
            <pattern id="hero-grid" width="56" height="56" patternUnits="userSpaceOnUse">
              <path d="M56 0H0v56" fill="none" stroke="white" strokeWidth="0.5" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#hero-grid)" />
        </svg>
      </div>

      <div className="container-page relative py-16 sm:py-20 lg:py-28">
        <div className="grid items-center gap-12 lg:grid-cols-12 lg:gap-16">
          <div className="lg:col-span-7">
            <p className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3.5 py-1.5 text-xs font-semibold text-brand-100 ring-1 ring-inset ring-white/15 animate-fade-in">
              <Sparkles className="size-3.5" aria-hidden="true" />
              Built on the ONEST open network
            </p>

            <h1 className="mt-5 font-display text-4xl font-extrabold leading-[1.1] tracking-tight text-white sm:text-5xl lg:text-6xl animate-fade-up">
              {/* Explicit space: a CSS margin would look right but would leave
                  the accessible name reading "youremployers". */}
              Certifications your{' '}
              <span className="relative inline-block">
                <span className="relative z-10 text-accent-300">employers trust</span>
                <span
                  className="absolute inset-x-0 bottom-1 z-0 h-3 rounded bg-accent-500/25"
                  aria-hidden="true"
                />
              </span>
            </h1>

            {/* indigo (not brand): this hero is purple in both themes, so its
                text must not follow the dark-theme token remap. */}
            <p className="mt-6 max-w-xl text-lg leading-relaxed text-indigo-100/90">
              {BRAND.name} takes a learner from enrollment through assessment to a tamper-evident
              certificate — then lets any hiring team confirm it in seconds, from a QR code or a
              single API call.
            </p>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link to="/register" className="sm:w-auto">
                <Button size="lg" fullWidth className="sm:w-auto">
                  Get started
                  <ArrowRight className="size-4" aria-hidden="true" />
                </Button>
              </Link>
              <Link to="/verify" className="sm:w-auto">
                <Button
                  size="lg"
                  fullWidth
                  variant="secondary"
                  className="sm:w-auto border-0 bg-white/10 text-white ring-1 ring-inset ring-white/20 shadow-none hover:bg-white/15 hover:ring-white/30"
                >
                  <ShieldCheck className="size-4" aria-hidden="true" />
                  Verify a certificate
                </Button>
              </Link>
            </div>

            <dl className="mt-12 grid max-w-lg grid-cols-3 gap-6 border-t border-white/10 pt-8">
              {[
                { value: '24', label: 'Portal screens' },
                { value: '1,000+', label: 'Verifications / hour' },
                { value: '2', label: 'LMS integrations' },
              ].map((stat) => (
                // `order` puts the value above its label visually while the
                // markup keeps the dt-then-dd order a definition list requires.
                // Plain flex-col (not -reverse) so a label that wraps to two
                // lines grows downward instead of shoving the value up.
                <div key={stat.label} className="flex flex-col">
                  <dt className="order-2 mt-1 text-xs leading-snug text-indigo-200/80">
                    {stat.label}
                  </dt>
                  <dd className="order-1 font-display text-2xl font-extrabold text-white sm:text-3xl">
                    {stat.value}
                  </dd>
                </div>
              ))}
            </dl>
          </div>

          {/* The spec calls for the verify box on the hero, so the main feature
              is visible without scrolling or signing in. */}
          <div className="lg:col-span-5">
            <VerifyBox />
          </div>
        </div>
      </div>
    </section>
  );
}

/* -------------------------------------------------------------- features -- */

const FEATURES = [
  {
    icon: GraduationCap,
    title: 'Course lifecycle, end to end',
    body: 'Publish courses with modules, prerequisites and mapped skills. Learners enroll, work through content and see progress update as they go.',
  },
  {
    icon: ClipboardCheck,
    title: 'Assessments that gate properly',
    body: 'Timed tests with attempt limits, auto-submit and instant scoring. Passing is what unlocks a certificate — nothing is issued by hand.',
  },
  {
    icon: BadgeCheck,
    title: 'Tamper-evident certificates',
    body: 'Every certificate is cryptographically signed, carries a QR code and can be revoked. Revocation is reflected the moment anyone checks.',
  },
  {
    icon: Zap,
    title: 'Verification in milliseconds',
    body: 'A public page for humans, a rate-limited REST API for HR systems. Built and load-tested well past the 1,000 requests per hour target.',
  },
  {
    icon: Layers,
    title: 'Skill-based certification tracks',
    body: 'Bundle courses, assessments and skills into a track. Learners see exactly what remains before they become eligible.',
  },
  {
    icon: Workflow,
    title: 'Plugs into your existing LMS',
    body: 'Adapters for Moodle and Canvas sync courses, enrollments and progress, so you keep the LMS you already run.',
  },
];

function Features() {
  return (
    <section className="py-20 sm:py-24" aria-labelledby="features-heading">
      <div className="container-page">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-sm font-semibold uppercase tracking-widest text-brand-600">
            Platform
          </p>
          <h2
            id="features-heading"
            className="mt-3 font-display text-3xl font-extrabold tracking-tight sm:text-4xl"
          >
            Everything a certification programme needs
          </h2>
          <p className="mt-4 text-lg text-ink-600">
            One system covering the learner, the training provider, the employer and the regulator
            — instead of four disconnected ones.
          </p>
        </div>

        <ul className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((feature) => (
            <li
              key={feature.title}
              className="group rounded-2xl bg-surface p-6 shadow-card ring-1 ring-ink-200 transition duration-300 hover:-translate-y-1 hover:shadow-lifted hover:ring-brand-200"
            >
              <span className="flex size-11 items-center justify-center rounded-xl bg-brand-50 text-brand-600 transition group-hover:bg-brand-600 group-hover:text-white">
                <feature.icon className="size-5.5" aria-hidden="true" />
              </span>
              <h3 className="mt-5 font-display text-lg font-bold">{feature.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-ink-600">{feature.body}</p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

/* ---------------------------------------------------------- how it works -- */

const STEPS = [
  {
    icon: GraduationCap,
    title: 'Enroll',
    body: 'A learner picks a course from the catalogue. Prerequisites are checked up front, so nobody starts something they cannot finish.',
  },
  {
    icon: Workflow,
    title: 'Learn',
    body: 'Modules are completed one by one. Progress syncs back from your LMS and is visible to both learner and provider.',
  },
  {
    icon: ClipboardCheck,
    title: 'Assess',
    body: 'A timed assessment decides the outcome. Scores, attempts and per-question review are recorded automatically.',
  },
  {
    icon: FileCheck2,
    title: 'Get certified',
    body: 'Passing issues a signed certificate with a QR code, publishes it to ONEST, and makes it verifiable immediately.',
  },
];

function HowItWorks() {
  return (
    <section
      id="how-it-works"
      className="scroll-mt-20 bg-ink-50 py-20 sm:py-24"
      aria-labelledby="how-heading"
    >
      <div className="container-page">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-sm font-semibold uppercase tracking-widest text-brand-600">
            How it works
          </p>
          <h2
            id="how-heading"
            className="mt-3 font-display text-3xl font-extrabold tracking-tight sm:text-4xl"
          >
            From enrollment to a verified credential
          </h2>
          <p className="mt-4 text-lg text-ink-600">
            Four steps, fully automated. No certificate is ever issued by hand.
          </p>
        </div>

        <ol className="mt-14 grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {STEPS.map((step, index) => (
            <li key={step.title} className="relative">
              {/* Connector between steps on wide screens only. */}
              {index < STEPS.length - 1 && (
                <span
                  aria-hidden="true"
                  className="absolute left-[calc(50%+2.5rem)] right-[calc(-50%+2.5rem)] top-7 hidden h-px bg-gradient-to-r from-brand-200 to-brand-100 lg:block"
                />
              )}
              <div className="relative flex h-full flex-col items-center rounded-2xl bg-surface p-6 text-center shadow-card ring-1 ring-ink-200">
                <span className="relative flex size-14 items-center justify-center rounded-2xl bg-brand-600 text-white shadow-brand">
                  <step.icon className="size-6" aria-hidden="true" />
                  <span className="absolute -right-1.5 -top-1.5 flex size-6 items-center justify-center rounded-full bg-accent-400 font-display text-xs font-extrabold text-brand-950">
                    {index + 1}
                  </span>
                </span>
                <h3 className="mt-5 font-display text-lg font-bold">{step.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-ink-600">{step.body}</p>
              </div>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

/* ---------------------------------------------------------------- tracks -- */

const TRACKS = [
  {
    icon: Code2,
    name: 'Full Stack Developer',
    level: 'NSQF Level 6',
    courses: 4,
    skills: ['React', 'Node.js', 'REST APIs', 'PostgreSQL'],
    accent: 'from-brand-500 to-brand-700',
  },
  {
    icon: Database,
    name: 'Data Engineering',
    level: 'NSQF Level 7',
    courses: 5,
    skills: ['SQL', 'Spark', 'ETL design', 'Warehousing'],
    accent: 'from-valid-500 to-valid-700',
  },
  {
    icon: Cpu,
    name: 'Cloud & DevOps',
    level: 'NSQF Level 6',
    courses: 4,
    skills: ['Docker', 'Kubernetes', 'CI/CD', 'Observability'],
    accent: 'from-accent-500 to-accent-700',
  },
];

function Tracks() {
  return (
    <section id="tracks" className="scroll-mt-20 py-20 sm:py-24" aria-labelledby="tracks-heading">
      <div className="container-page">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-sm font-semibold uppercase tracking-widest text-brand-600">
            Certification tracks
          </p>
          <h2
            id="tracks-heading"
            className="mt-3 font-display text-3xl font-extrabold tracking-tight sm:text-4xl"
          >
            Skills mapped to recognised frameworks
          </h2>
          <p className="mt-4 text-lg text-ink-600">
            Each track bundles courses, assessments and validated skills, aligned to NSQF levels
            and SFIA skill definitions.
          </p>
        </div>

        <ul className="mt-14 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {TRACKS.map((track) => (
            <li
              key={track.name}
              className="group overflow-hidden rounded-2xl bg-surface shadow-card ring-1 ring-ink-200 transition duration-300 hover:-translate-y-1 hover:shadow-lifted"
            >
              <div className={'bg-gradient-to-br ' + track.accent + ' px-6 py-7 text-white'}>
                <track.icon className="size-7" aria-hidden="true" />
                <h3 className="mt-4 font-display text-xl font-bold">{track.name}</h3>
                <p className="mt-1 text-sm text-white/80">
                  {track.level} · {track.courses} courses
                </p>
              </div>
              <div className="px-6 py-5">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-ink-500">
                  Skills validated
                </h4>
                <ul className="mt-3 flex flex-wrap gap-2">
                  {track.skills.map((skill) => (
                    <li
                      key={skill}
                      className="rounded-full bg-ink-100 px-2.5 py-1 text-xs font-medium text-ink-700"
                    >
                      {skill}
                    </li>
                  ))}
                </ul>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------- employers -- */

function Employers() {
  return (
    <section
      id="employers"
      className="palette-light scroll-mt-20 bg-ink-900 py-20 text-white sm:py-24"
      aria-labelledby="employers-heading"
    >
      <div className="container-page grid items-center gap-12 lg:grid-cols-2 lg:gap-16">
        <div>
          <p className="text-sm font-semibold uppercase tracking-widest text-brand-300">
            For hiring teams
          </p>
          <h2
            id="employers-heading"
            className="mt-3 font-display text-3xl font-extrabold tracking-tight text-white sm:text-4xl"
          >
            Stop taking certificates on trust
          </h2>
          <p className="mt-4 text-lg leading-relaxed text-ink-300">
            Paste an ID, scan a QR code, or wire the REST API straight into your ATS. You get the
            candidate, the issuer, the skills validated, and whether the credential is still live.
          </p>

          <ul className="mt-8 space-y-4">
            {[
              'Revoked certificates report as revoked, instantly',
              'API keys with usage tracking and rate limits',
              'Every verification written to an immutable audit log',
            ].map((item) => (
              <li key={item} className="flex items-start gap-3">
                <BadgeCheck className="mt-0.5 size-5 shrink-0 text-valid-500" aria-hidden="true" />
                <span className="text-ink-200">{item}</span>
              </li>
            ))}
          </ul>

          <div className="mt-9 flex flex-col gap-3 sm:flex-row">
            <Link to="/register">
              <Button size="lg" fullWidth className="sm:w-auto">
                <Building2 className="size-4" aria-hidden="true" />
                Create an employer account
              </Button>
            </Link>
          </div>
        </div>

        {/* Illustrative API exchange. Static markup, not a live call. */}
        <div className="overflow-hidden rounded-2xl bg-ink-950/80 shadow-lifted ring-1 ring-white/10">
          <div className="flex items-center gap-2 border-b border-white/10 px-4 py-3">
            <span className="size-2.5 rounded-full bg-danger-500" aria-hidden="true" />
            <span className="size-2.5 rounded-full bg-accent-400" aria-hidden="true" />
            <span className="size-2.5 rounded-full bg-valid-500" aria-hidden="true" />
            <span className="ml-2 font-mono text-xs text-ink-400">verification API</span>
          </div>
          <pre className="overflow-x-auto px-5 py-5 font-mono text-xs leading-relaxed text-ink-300">
            <code>
              <span className="text-valid-400">GET</span> /api/v1/verify/SS-2026-4F8A-21D9{'\n'}
              <span className="text-ink-400">x-api-key:</span> sk_live_••••••••{'\n\n'}
              <span className="text-ink-400">200 OK</span>
              {'\n'}
              {'{'}
              {'\n'}
              {'  '}<span className="text-brand-300">"status"</span>: {'"'}
              <span className="text-valid-400">VALID</span>
              {'",\n'}
              {'  '}<span className="text-brand-300">"candidate"</span>: "Ananya Rao",{'\n'}
              {'  '}<span className="text-brand-300">"certification"</span>: "Full Stack
              Developer",{'\n'}
              {'  '}<span className="text-brand-300">"issuer"</span>: "Infosys Springboard",{'\n'}
              {'  '}<span className="text-brand-300">"issuedAt"</span>: "2026-04-12",{'\n'}
              {'  '}<span className="text-brand-300">"expiresAt"</span>: "2029-04-12",{'\n'}
              {'  '}<span className="text-brand-300">"skills"</span>: ["React", "Node.js"],{'\n'}
              {'  '}<span className="text-brand-300">"onest"</span>: {'{ '}
              <span className="text-brand-300">"published"</span>: true {'}'}
              {'\n'}
              {'}'}
            </code>
          </pre>
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------- CTA -- */

function CallToAction() {
  return (
    <section className="py-20 sm:py-24" id="onest">
      <div className="container-page">
        <div className="relative overflow-hidden rounded-3xl bg-brand-700 px-6 py-14 text-center shadow-lifted sm:px-12 sm:py-20">
          <div aria-hidden="true" className="pointer-events-none absolute inset-0">
            <div className="absolute -right-20 -top-20 size-80 rounded-full bg-brand-500/40 blur-3xl" />
            <div className="absolute -bottom-24 -left-16 size-80 rounded-full bg-brand-400/30 blur-3xl" />
          </div>

          <div className="relative mx-auto max-w-2xl">
            <h2 className="font-display text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
              Ready to issue credentials that hold up?
            </h2>
            <p className="mt-4 text-lg text-brand-100">
              Set up your first certification track in minutes. Learners, assessments and
              verification all work from day one.
            </p>
            <div className="mt-9 flex flex-col justify-center gap-3 sm:flex-row">
              <Link to="/register">
                <Button
                  size="lg"
                  fullWidth
                  className="bg-surface text-brand-700 shadow-none hover:bg-brand-50 sm:w-auto"
                >
                  Create your account
                  <ArrowRight className="size-4" aria-hidden="true" />
                </Button>
              </Link>
              <Link to="/login">
                <Button
                  size="lg"
                  fullWidth
                  variant="secondary"
                  className="border-0 bg-white/10 text-white ring-1 ring-inset ring-white/25 shadow-none hover:bg-white/20 sm:w-auto"
                >
                  Sign in
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ page -- */

export default function LandingPage() {
  // Rich results for the product itself plus the four-step process.
  const structuredData = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'WebSite',
        '@id': absoluteUrl('/#website'),
        url: absoluteUrl('/'),
        name: BRAND.name,
        description: BRAND.description,
        publisher: { '@id': absoluteUrl('/#organization') },
      },
      {
        '@type': 'Organization',
        '@id': absoluteUrl('/#organization'),
        name: BRAND.name,
        legalName: BRAND.legalName,
        url: absoluteUrl('/'),
        email: BRAND.supportEmail,
      },
      {
        '@type': 'HowTo',
        name: 'How to earn a verifiable certification',
        description: 'From course enrollment to a verifiable certificate.',
        step: STEPS.map((step, index) => ({
          '@type': 'HowToStep',
          position: index + 1,
          name: step.title,
          text: step.body,
        })),
      },
    ],
  };

  return (
    <>
      <Seo
        title={BRAND.name + ' — Verifiable corporate certifications on ONEST'}
        description={BRAND.description}
        path="/"
        structuredData={structuredData}
        appendBrand={false}
      />
      <Hero />
      <Features />
      <HowItWorks />
      <Tracks />
      <Employers />
      <CallToAction />
    </>
  );
}
