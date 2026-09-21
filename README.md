# SkillSeal

An ONEST-compliant certification platform for corporate training programs.

Learners enroll in courses, complete modules, sit assessments and earn tamper-evident
certificates. Any employer can then verify those certificates in seconds — from a QR code,
a public web page, or a rate-limited REST API wired into their own HR systems.

> **Project status — all 24 screens built.** Every screen in the UI specification is
> implemented against a real API: the four public/auth screens (plus a separate admin sign-in),
> the nine-screen learner portal, the five-screen provider portal, the two-screen employer
> portal and the four-screen admin console. No placeholders remain.

> A short record of what was built, the decisions behind it and what is still
> open lives in [docs/PROJECT-LOG.md](docs/PROJECT-LOG.md).

---

## Quick start

Requires **Node.js 20.11+**. Nothing else — the local database is SQLite, so there is no
Docker, Postgres or Redis to install.

```bash
npm run setup
```

That installs dependencies, copies `.env.example` to `.env` in both apps on first run (never
overwriting an existing file), builds the shared package, creates the database and seeds demo
accounts. Then:

```bash
npm run dev
```

| Service  | URL                             |
| -------- | ------------------------------- |
| Web app  | http://localhost:5173           |
| API      | http://localhost:4000/api       |
| Health   | http://localhost:4000/api/health |

### Demo accounts

All four use the password `Demo@1234!`, and each sign-in page has one-click fill buttons.

| Role             | Email               | Sign in at      | Lands on              |
| ---------------- | ------------------- | --------------- | --------------------- |
| Learner          | `student@demo.test` | `/login`        | `/student/dashboard`  |
| Training provider| `company@demo.test` | `/login`        | `/company/dashboard`  |
| Employer / HR    | `hr@demo.test`      | `/login`        | `/hr/verify`          |
| Administrator    | `admin@demo.test`   | `/admin/login`  | `/admin/dashboard`    |

### Demo certificates

Seeded to cover every verification outcome. Try them at `/verify` or on the HR screen:

| Certificate ID | Result | Why |
| --- | --- | --- |
| `SS-2026-4F8A-21D9` | **VALID** | Active, in date, signature checks out |
| `SS-2023-7K2M-55XP` | **EXPIRED** | Genuine, but past its validity period |
| `SS-2026-9QW3-4RT7` | **REVOKED** | Withdrawn by the issuer, with a reason |
| `SS-2026-TMP1-8VZ2` | **TAMPERED** | Stored data no longer matches its signature |
| anything else | **NOT_FOUND** | No such credential |

---

## Certificates and verification

Certificates are **immutable historical records**. The holder name, issuer name and skill list are
snapshotted at issuance rather than read through relations, so a later rename does not rewrite
history — and, critically, does not invalidate the signature.

### Tamper evidence

Each certificate is signed with **Ed25519** over a canonical string built from its snapshotted
fields. Canonicalisation is deliberate: verification recomputes it from database columns months
later, so keys are emitted in a fixed order, dates normalised to UTC ISO-8601, and skills sorted
(a reordered list still verifies).

Revocation status is deliberately **outside** the signed payload — revoking must not require
re-signing.

The verifier checks in a fixed order: **integrity → revocation → expiry**. A tampered record must
never be reported as merely "expired", and revocation outranks expiry because it is the stronger
statement. `TAMPERED` is distinct from `NOT_FOUND`: it means the row exists but no longer matches
its signature, which implies the database was edited directly — a security incident, and the UI
says so.

> The dev signing keypair in `.env.example` is **public and disposable**. Generate a fresh one
> before any real deployment; the command is in the file.

### Endpoints

| Method | Path | Auth | Notes |
| --- | --- | --- | --- |
| `GET` | `/api/verify/:certificateId` | none | Public. What the QR code hits. `Cache-Control: no-store` |
| `POST` | `/api/hr/verify` | HR, ADMIN | Same check, attributed to the user for their history |
| `GET` | `/api/hr/verify/history` | HR, ADMIN | That user's checks, plus their org's API-key checks |
| `GET` `POST` `DELETE` | `/api/hr/api-keys` | HR, ADMIN | Issue, list and revoke verification API keys |
| `GET` | `/api/student/certificates` | STUDENT | A learner's own certificates |
| `GET` | `/api/student/certificates/:id` | STUDENT | One certificate, scoped to its holder |

### API keys

Employers can issue keys so their own systems call the verification API directly with an
`x-api-key` header. Only a SHA-256 hash is stored — the plaintext is shown once at creation and
is unrecoverable, exactly like refresh tokens. A key prefix is kept in clear so the UI can
identify a key in a list without being able to use it.

Key authentication on the public endpoint is deliberately **non-blocking**: the endpoint works
with no key at all (that is what a QR scan does), and an invalid key is treated exactly like no
key rather than returning 401, so probing cannot distinguish the two. A valid key only changes
attribution — the check is logged against the key and the `API` channel — and bumps the usage
counter.

Public verification is never cached — a certificate can be revoked at any moment, and a stale
`VALID` is the one answer this endpoint must never give. Malformed IDs short-circuit without
touching the database. Every attempt, successful or not, is written to `verification_logs`, which
is why `certificateId` there is a plain string rather than a foreign key.

---

## Architecture

```
skillseal/
├── apps/
│   ├── api/                 Express + Prisma REST API
│   │   ├── prisma/          schema, migrations, seed
│   │   └── src/
│   │       ├── config/      env validation (fails fast at boot)
│   │       ├── lib/         prisma, logger, tokens, password, errors
│   │       ├── middleware/  auth, validation, rate limiting, error handler
│   │       ├── modules/     feature slices (auth, health)
│   │       └── services/    cross-cutting services (audit log)
│   └── web/                 React 19 + Vite SPA
│       ├── public/          robots.txt, sitemap.xml, favicon, manifest
│       └── src/
│           ├── components/  ui primitives, layouts, SEO
│           ├── features/    feature slices (auth)
│           ├── lib/         api client, query client, helpers
│           ├── pages/       route-level pages
│           └── styles/      design tokens
└── packages/
    └── shared/              Zod schemas, types, roles, brand — used by BOTH apps
```

### Why a separate API rather than Next.js

The deliverable explicitly includes *"APIs for HR systems to verify candidate certifications"* —
a third-party-consumable service with API keys and rate limits. Keeping it standalone makes that
a first-class artifact (documentable in OpenAPI, callable with curl) and gives the ONEST/Beckn
server-to-server callbacks a natural home. Only one of the 24 screens would have benefited from
server-side rendering.

### The shared package

`packages/shared` holds the Zod schemas, TypeScript types and role constants that both apps
import. The registration form and the API endpoint validate against *the same schema object*, so
client and server validation cannot drift apart. The password strength meter scores against the
same rules the server enforces — it can never say "strong" for a password the API would reject.

The API consumes it through the normal npm workspace link (`packages/shared/dist`). The web app
instead **aliases it to `packages/shared/src` in `vite.config.ts`**, because this project lives
under a path containing non-ASCII characters (`…/文档/…`) and Vite cannot resolve the workspace
symlink through such a path on Windows. Both still read the same files, so there is no drift.

> **Do not point that alias at a copy.** If `@skillseal/shared` is ever aliased to a duplicated
> folder inside `apps/web/src`, edits to the shared package will reach the API and silently *not*
> the web app — the exact failure this package exists to prevent.

### Two things that will waste your afternoon

Both were hit during development and are now guarded in `.gitignore`:

1. **Never let `tsc` emit into `apps/web/src`.** Vite's default resolve order tries `.js` before
   `.ts`, so a stray emitted `Seo.js` silently shadows `Seo.tsx` and your edits stop appearing
   with no error anywhere. The web `typecheck` script must stay `tsc -b` (which honours
   `noEmit`), never `tsc -b --noEmit false`.
2. **Never let a compiled `vite.config.js` sit next to `vite.config.ts`.** Vite loads the `.js`
   first, so every change to the `.ts` config is ignored — including aliases, which produces
   confusing "failed to resolve import" errors that contradict the config you are reading.

---

## Authentication

A deliberately conventional, defensible design:

| Concern | Approach |
| --- | --- |
| Access token | JWT, 15-minute TTL, held **in memory only** — never localStorage, so XSS cannot exfiltrate it |
| Refresh token | Opaque random string in an `httpOnly` cookie; only its SHA-256 hash is stored |
| Rotation | Every refresh revokes the old token and issues a new one |
| Reuse detection | Presenting an already-rotated token revokes the entire token family and writes an audit entry |
| Password hashing | bcrypt, cost 12 |
| User enumeration | Login equalises response timing for unknown accounts; password reset always returns the same message |
| Brute force | 5 failed attempts locks an account for 15 minutes, independently of IP rate limits |
| Session renewal | The client refreshes ~60s before expiry, so an idle tab never hits a 401 on the next click |

Concurrent requests arriving on an expired token share **one** in-flight refresh rather than
triggering a stampede, and `authApi.refresh` is de-duplicated at module level.

### The refresh-rotation race

Rotation plus strict reuse detection has a sharp edge: two tabs booting at once (or React
StrictMode double-invoking an effect in development) both present the same token, the second
arrives after it has rotated, and a naive implementation revokes the entire family and signs the
user out for no reason. This was hit during development.

It is handled on both sides:

- **Client** — one shared in-flight refresh promise, so a second call never goes out.
- **Server** — a 15-second grace window. A token presented shortly after rotating is issued a
  fresh one instead of killing the session.

The grace window keys off `replacedBy`, which is set **only** by normal rotation. Tokens killed
as part of a family revocation leave it null, so they can never be walked back in through the
grace path — without that check the window would silently undo the very revocation it sits
beside. Both properties are worth keeping tested: a benign replay must survive, and a genuine
replay after the window must still revoke the whole family.

### Two sign-in pages

| Page | For | Notes |
| --- | --- | --- |
| `/login` | Learner, Training provider, Employer / HR | The three self-signup roles, all the same trust tier |
| `/admin/login` | Administrator | Unlinked from the public site, `noindex`, excluded by `robots.txt` |

Deep links respect the split: a signed-out visitor to `/admin/*` is sent to `/admin/login`, and
to `/student/*` is sent to `/login` — each returning them to the page they wanted after signing in.

> **This is a separate entry point, not a security boundary.** Both pages post to the same
> `/api/auth/login`, which returns an identical error for every failure. That is deliberate: if
> the admin page refused non-admins with its own message, it could be used to discover which
> email addresses hold administrator accounts. A non-admin who signs in there is simply routed to
> their own portal instead.
>
> What actually protects the ADMIN role is: **no self-registration** (`ADMIN` is excluded from
> `SELF_SIGNUP_ROLES`, enforced by the Zod schema server-side), the audit trail, and — still to
> add — MFA and a shorter session TTL. In production, `/admin/*` is also the natural place to
> apply an IP allowlist at the edge, which is the one real benefit of the separate path.

### Endpoints

| Method | Path | Notes |
| --- | --- | --- |
| `POST` | `/api/auth/register` | Creates user, and an organization for provider/employer roles |
| `POST` | `/api/auth/login` | `rememberMe` controls refresh cookie lifetime (30d vs 1d) |
| `POST` | `/api/auth/refresh` | Rotates the refresh token |
| `POST` | `/api/auth/logout` | Revokes the presented refresh token |
| `GET`  | `/api/auth/me` | Requires a bearer access token |
| `POST` | `/api/auth/forgot-password` | Always succeeds; link is logged in dev |
| `POST` | `/api/auth/reset-password` | Consumes the token and revokes all sessions |

Every response uses one envelope — `{ ok: true, data }` or
`{ ok: false, error: { code, message, details? } }` — so the client has exactly one shape to
handle. `details` is keyed by form field, which is how server-side validation errors land on the
right inputs.

---

## SEO

The public pages are built to be indexed properly despite being a SPA:

- **Static metadata in `index.html`** — title, description, canonical, Open Graph and Twitter
  cards are present in the served HTML, so crawlers and link unfurlers see a complete document
  without executing JavaScript.
- **Per-route metadata** via the `<Seo>` component, using React 19's native `<title>`/`<meta>`
  hoisting (no helmet dependency).
- **JSON-LD structured data** — `Organization` and `WebSite` graphs, plus a `HowTo` graph
  describing the four-step certification process.
- **Semantic HTML** — one `<h1>` per page, correct heading order, `<nav>`/`<main>`/`<footer>`
  landmarks, `aria-labelledby` on every section, and a skip-to-content link.
- **`robots.txt`** allows the landing and verify pages, disallows credential and portal routes.
- **`sitemap.xml`** for the public routes.
- **A `<noscript>` fallback** describing the product.

> **Known limit.** Route-level metadata requires JavaScript. Googlebot renders JS fine, but for
> guaranteed unfurls on every crawler, add a prerender step for `/` and `/verify/*` at deploy
> time. The static tags in `index.html` are the fallback until then.

---

## Accessibility & responsiveness

- Mobile-first; verified at 390px, 768px and desktop widths.
- Every form control is label-associated, with `aria-invalid`, `aria-describedby` and
  `role="alert"` on errors.
- Minimum 44px touch targets on interactive controls.
- One consistent `:focus-visible` ring across the app.
- `prefers-reduced-motion` disables all animation.
- Mobile navigation drawer traps page scroll and closes on route change.

---

## Database

Local development uses **SQLite** so the project runs with zero external services. The schema is
written to be Postgres-compatible: no native enums (roles are strings validated by Zod), no
SQLite-only types.

**Moving to PostgreSQL** is two lines:

1. `apps/api/prisma/schema.prisma` → `provider = "postgresql"`
2. `apps/api/.env` → `DATABASE_URL="postgresql://..."`

Then `npm run db:migrate`.

### Current tables

| Table | Purpose |
| --- | --- |
| `organizations` | Training providers and employers |
| `users` | Accounts, roles, lockout state |
| `refresh_tokens` | Hashed, rotating, revocable sessions |
| `password_reset_tokens` | Single-use, 30-minute expiry |
| `audit_logs` | Append-only trail backing `/admin/audit` |

### Commands

```bash
npm run db:migrate    # create/apply a migration
npm run db:seed       # re-seed demo accounts (idempotent)
npm run db:studio     # browse data in Prisma Studio
npm run db:reset      # drop and rebuild from scratch
```

---

## Scripts

| Command | Does |
| --- | --- |
| `npm run setup` | Install, build shared, migrate, seed |
| `npm run dev` | Run API and web together |
| `npm run build` | Production build of all three packages |
| `npm run typecheck` | Typecheck every workspace |
| `npm test` | Run the test suites (40 tests) |

### Frontend quality

- **Error boundary** at the root, so a render crash shows a recoverable panel rather than a
  blank page. It catches render errors only — handler and async failures are covered by
  TanStack Query's error states and the `ApiError` envelope.
- **Per-portal 404s**, scoped to each portal's path prefix. A bare `*` inside a pathless parent
  would match every route in the app, including other roles'.
- **Mobile verified at 390px** across all 14 portal pages plus the public pages: zero horizontal
  overflow, measured rather than eyeballed.
- **axe-core audit** (WCAG 2.1 A/AA) across the public and admin pages: zero violations. Three
  real problems were found and fixed:
  - the icon-only sign-out button had no accessible name below `sm` (`hidden` -> `sr-only`),
  - wide tables were scrollable but not keyboard-focusable, so content past the right edge was
    unreachable (`TableScroll` adds `tabIndex` and a labelled region),
  - `text-ink-500` on dark backgrounds failed contrast (raised to `ink-400`).
- **Assessment questions reorder** by drag-and-drop, with move-up/down buttons because dragging
  is not operable by keyboard. Focus follows the moved item.
- **Bundle**: the entry chunk is ~31 kB (it was ~306 kB before `manualChunks` was switched to the
  function form that actually catches `react-dom` and `scheduler`). `lucide-react` is bundled
  into one chunk rather than ~33 sub-kilobyte files; `qrcode` stays lazy with the certificate
  page.
- **Prerender** (`scripts/prerender.mjs`) emits a static `<head>` per public route at build time,
  so a crawler that does not run JavaScript gets the right title and canonical rather than the
  landing page's. It does not render the body — that would need real SSR.

### Theming

Light and dark, toggled in either header and remembered in `localStorage`;
`system` follows the OS and reacts to it changing. The preference is applied as
`data-theme` on `<html>`.

Tailwind v4 emits utilities as `var(--color-*)`, so the dark theme is almost
entirely a matter of redefining tokens in `styles/index.css` — no component
markup changed. Three rules keep that safe, and each one exists because
ignoring it broke something during the build:

1. **Only background-only shades flip wholesale.** The `-50`/`-100` tints
   qualify. `-600`/`-700` do not: they are both button fills and text colours,
   so their `text-*` utilities are remapped separately by class name.
2. **`bg-white` and `text-white` were split.** Surfaces use `bg-surface`, which
   flips; `text-white` on a coloured button does not.
3. **Regions that are dark by design opt out**, via `.palette-light` — the
   footer, the admin sign-in ground, code blocks and the lesson media area all
   use `bg-ink-900` with light text, which only reads correctly while the ramp
   is the light one. The certificate uses the same escape hatch for the
   opposite reason: it is a document and must match what prints.

`text-brand-100`/`-200` are pinned back to their light values, because they are
used as text on the purple banners, which stay purple in both themes.

Verified with axe (WCAG 2.1 A/AA) across eight routes **in both themes**: zero
violations. That sweep also caught four pre-existing light-mode problems that
predate theming — an unnamed `role="progressbar"`, a `<dl>` whose `dt`/`dd`
were not direct children, and two labels sitting a hair under 4.5:1.

### Tests

`npm test` runs 40 tests across two suites: password policy and certificate-ID parsing in
`packages/shared` (22), and the verification result card, error boundary and strength meter in
the web app (18). The result card is covered hardest, since the one thing that must never go
wrong is a revoked, expired or tampered credential reading as acceptable.

---

## Roadmap

All screens in the UI specification are complete, along with the full authentication system.
The remaining work is integration rather than UI — see **Not yet started** below.

| Area | Screens | Status |
| --- | --- | --- |
| Public & Auth | 4 | **Done** — landing, login (+ admin sign-in), register, public verify |
| Student portal | 9 | **Done** — dashboard, catalogue, course, learn, assessment, result, certifications, certificate, profile |
| Company / Trainer portal | 5 | **Done** — dashboard, courses, assessment builder, learners, tracks |
| HR / Employer portal | 2 | **Done** — verify, history & API keys |
| Admin portal | 4 | **Done** — dashboard, users & orgs, audit, reports & ONEST |

All specified screens are built. The remaining work is integration rather than UI — see
**Not yet started** below.

### Not yet started

- Certificate issuance loop — certificates currently exist only via the seed
- ONEST/Beckn BPP adapter (`search`/`select`/`init`/`confirm`/`status` + `on_*` callbacks)
- LMS adapters for Moodle and Canvas
- Certificate PDF download and QR camera scanning
- Transactional email (password reset links are currently logged to the console)

---

## Production checklist

Before deploying anywhere real:

- [ ] Replace both JWT secrets with generated values
      (`node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"`)
- [ ] Switch Prisma to PostgreSQL
- [ ] Set `NODE_ENV=production` (enables `secure` cookies and disables verbose errors)
- [ ] Set `CORS_ORIGINS` to the real web origin
- [ ] Remove the demo-account blocks from `LoginPage.tsx` **and** `AdminLoginPage.tsx`
- [ ] Add MFA and a shorter access-token TTL for the ADMIN role
- [ ] Consider an IP allowlist on `/admin/*` at the edge
- [ ] Wire a transactional email provider for password resets
- [ ] Set `VITE_SITE_URL` and update `BRAND.url` in `packages/shared/src/brand.ts`
- [ ] Update the hardcoded domain in `public/robots.txt` and `public/sitemap.xml`
