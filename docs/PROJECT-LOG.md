# SkillSeal — project log

A short record of what was built, why the tricky decisions went the way they
did, and what is still open. The [README](../README.md) is the full reference;
this is the memory jogger.

**Brief:** *Project 2 — ONEST Integration for Corporate Certification Programs*
(`info1.pdf`, 24 screens across 5 portals).

---

## Status at a glance

| | |
| --- | --- |
| Screens | **24 of 24** built, plus a separate admin sign-in. No placeholders. |
| Code | ~18,000 lines · 117 files |
| Database | 24 tables · 4 migrations |
| API | 32 endpoints |
| Tests | 62 passing |
| Accessibility | axe WCAG 2.1 AA clean — 8 routes × 2 themes |
| Mobile | verified at 390px, zero horizontal overflow |

**One-line summary:** the application is done; the integrations are not.
Everything a user touches works. What is missing is the machine-to-machine half
(ONEST, LMS) and the issuance step that closes the loop.

---

## Stack

React 19 + Vite + Tailwind v4 · Express + Prisma · SQLite (Postgres-ready) ·
npm workspaces (`apps/api`, `apps/web`, `packages/shared`).

Chosen over Next.js because the brief's deliverable includes a
third-party-consumable verification API, which deserves to be a standalone,
documentable service. Only one of 24 screens would have benefited from SSR.

---

## Decisions worth remembering

**Certificates are immutable.** Holder name, issuer and skills are snapshotted
at issuance, not read through relations. A later rename must not rewrite
history or invalidate the signature.

**Signing is Ed25519 over a canonical string.** Verification recomputes it from
database columns months later, so keys are emitted in fixed order, dates
normalised to UTC ISO-8601, and skills sorted. Revocation sits *outside* the
signed payload — revoking must not require re-signing.

**Verification order is integrity → revocation → expiry.** A tampered record
must never be reported as merely "expired". `TAMPERED` is distinct from
`NOT_FOUND`: the row exists but no longer matches its signature, which implies
the database was edited directly.

**Certificate IDs are random, not sequential.** `SS-2026-4F8A-21D9` uses
`crypto.randomInt`. A sequential scheme would let anyone walk the public verify
endpoint and harvest real credentials.

**One login for Student/Provider/HR, a separate page for Admin.** Split by
trust tier, not persona. The separate admin URL is obscurity, not a boundary —
what actually protects that role is no self-registration, the audit trail, and
(still to add) MFA. Neither page rejects the "wrong" role, because a
role-specific error message would leak which emails are admins.

**API keys never block the public endpoint.** It works with no key (that is a
QR scan), and an invalid key is treated exactly like no key, so probing cannot
distinguish the two. A valid key only changes attribution.

**Dark mode is token redefinition, not new markup.** Tailwind v4 emits
`var(--color-*)`, so the theme lives in one CSS file. Three rules keep it safe —
see "Theming" in the README. `.palette-light` is the escape hatch for regions
that are dark by design (footer, code blocks) and for the certificate, which is
a document and must match what prints.

---

## Bugs that cost real time — do not reintroduce

**Compiled output shadowing source.** A stray `vite.config.js` sat next to
`vite.config.ts`; Vite loads the `.js` first, so every config edit was silently
ignored. Separately, ~50 compiled `.js` files had been emitted into
`apps/web/src`, and Vite resolves `.js` before `.ts`, so `Seo.js` shadowed
`Seo.tsx`. Both now gitignored. The web `typecheck` script must stay `tsc -b`.

**Refresh-rotation race.** Two tabs (or React StrictMode) refreshing at once
made the second present an already-rotated token, which reuse detection
correctly read as a replay — and signed the user out. Fixed on both sides: a
shared in-flight promise on the client, a 15-second grace window on the server.
The grace keys off `replacedBy`, which only normal rotation sets; without that
check it would have silently undone the family revocation it sits beside.

**React 19 appends metadata, it does not replace it.** Every page carried two
`robots` and two `canonical` tags, so `/login` would have been indexed. Static
tags are now marked `data-seo-default` and stripped once a route renders.

**Duplicated shared package.** `apps/web/src/shared/` was a byte-identical copy
with the Vite alias pointing at it, so edits reached the API but not the web
app. Removed. The alias must point at `packages/shared/src` — a plain workspace
import cannot resolve here because the project path contains `文档` and Vite
cannot follow the symlink through non-ASCII paths on Windows.

---

## What is still open

**Blocks the core demo**

- **Certificate issuance.** Certificates only exist because the seed creates
  them. A learner who becomes eligible cannot actually receive one. ~2–3h.

**The two KPI integrations, neither started**

- **ONEST/Beckn BPP adapter** — `search`/`select`/`init`/`confirm`/`status` plus
  `on_*` callbacks and Ed25519-signed headers. The Retry button currently sets
  the column directly and says so in the UI. ~2–3 days.
- **LMS integration with 2 platforms** — one `LmsProvider` interface, then
  Moodle and Canvas behind it. ~2–3 days.

**Smaller**

Profile-edit endpoint · course thumbnail uploads · QR camera scanning ·
server-side PDF (browser print-to-PDF works today) · transactional email (reset
links log to the console) · admin MFA and shorter session.

**Before deploying**

Switch Prisma to Postgres · regenerate both JWT secrets and the certificate
signing key · remove the demo blocks from both login pages · update the domain
in `robots.txt` and `sitemap.xml` · produce a load-test report for the
1,000 req/hour KPI.

---

## Running it

```bash
npm run setup   # install, build shared, migrate, seed
npm run dev     # web :5173 · api :4000
```

Demo accounts use `Demo@1234!`. Learner/provider/employer sign in at `/login`;
the administrator at `/admin/login`.

Seeded certificates cover every verification outcome — valid, expired, revoked,
tampered — and are listed in the README.

---

*Last updated: 21 September 2026.*
