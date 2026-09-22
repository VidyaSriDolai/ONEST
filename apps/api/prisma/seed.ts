/**
 * Seeds the platform with demo accounts and certificates, reconstructed from
 * the original seed's output (recovered via prisma/seed-data.json after the
 * source was lost).
 *
 * Idempotent: upserts every record, so it can be run repeatedly.
 * Password for every demo account: Demo@1234!
 */
import { PrismaClient } from '@prisma/client';
import { hashPassword } from '../src/lib/password.js';
import { signCertificate } from '../src/lib/certificate-signing.js';
import seedLearning from './seed-learning.js';

const prisma = new PrismaClient();

const DEMO_PASSWORD = 'Demo@1234!';

const organizations = [
  { name: 'Infosys Springboard', slug: 'infosys-springboard', kind: 'COMPANY' },
  { name: 'Acme Technologies', slug: 'acme-technologies', kind: 'EMPLOYER' },
];

const users = [
  { email: 'student@demo.test', fullName: 'Ananya Rao', role: 'STUDENT', orgSlug: null },
  { email: 'company@demo.test', fullName: 'Rohit Sharma', role: 'COMPANY', orgSlug: 'infosys-springboard' },
  { email: 'hr@demo.test', fullName: 'Priya Nair', role: 'HR', orgSlug: 'acme-technologies' },
  { email: 'admin@demo.test', fullName: 'Platform Admin', role: 'ADMIN', orgSlug: null },
];

interface CertificateSpec {
  certificateId: string;
  trackSlug: string;
  issued: string;
  validMonths: number;
  score: number;
  status: 'ISSUED' | 'REVOKED';
  revokedReason?: string;
  extraSkills?: string[];
}

// Four certificates covering every verification outcome:
// VALID, EXPIRED, REVOKED and TAMPERED (tampered = row edited post-signing).
const certificates: CertificateSpec[] = [
  {
    certificateId: 'SS-2026-4F8A-21D9',
    trackSlug: 'full-stack-developer',
    issued: '2026-05-19T19:16:10.114Z',
    validMonths: 36,
    score: 88,
    status: 'ISSUED',
  },
  {
    certificateId: 'SS-2023-7K2M-55XP',
    trackSlug: 'cloud-devops-engineer',
    issued: '2024-03-19T19:16:10.114Z',
    validMonths: 24,
    score: 79,
    status: 'ISSUED',
  },
  {
    certificateId: 'SS-2026-9QW3-4RT7',
    trackSlug: 'full-stack-developer',
    issued: '2026-01-19T19:16:10.114Z',
    validMonths: 36,
    score: 72,
    status: 'REVOKED',
    revokedReason: 'Issued in error — assessment result was later invalidated.',
  },
  {
    certificateId: 'SS-2026-TMP1-8VZ2',
    trackSlug: 'full-stack-developer',
    issued: '2026-06-19T19:16:10.114Z',
    validMonths: 36,
    score: 95,
    status: 'ISSUED',
    // One skill more than the signature covers — the tamper marker.
    extraSkills: ['Kubernetes'],
  },
];

const MONTH_MS = 30 * 24 * 60 * 60 * 1000;

async function seedUsers(): Promise<Map<string, string>> {
  const passwordHash = await hashPassword(DEMO_PASSWORD);
  const idByEmail = new Map<string, string>();

  for (const org of organizations) {
    await prisma.organization.upsert({
      where: { slug: org.slug },
      update: { name: org.name, kind: org.kind },
      create: org,
    });
  }

  for (const user of users) {
    const org = user.orgSlug
      ? await prisma.organization.findUniqueOrThrow({ where: { slug: user.orgSlug } })
      : null;
    const record = await prisma.user.upsert({
      where: { email: user.email },
      update: { fullName: user.fullName, role: user.role, organizationId: org?.id ?? null },
      create: {
        email: user.email,
        passwordHash,
        fullName: user.fullName,
        role: user.role,
        organizationId: org?.id ?? null,
      },
    });
    idByEmail.set(user.email, record.id);
  }

  return idByEmail;
}

async function seedCertificates(holderId: string): Promise<void> {
  const holder = await prisma.user.findUniqueOrThrow({
    where: { id: holderId },
    select: { fullName: true },
  });

  for (const spec of certificates) {
    const track = await prisma.certificationTrack.findUniqueOrThrow({
      where: { slug: spec.trackSlug },
      include: { skills: { include: { skill: { select: { name: true } } } } },
    });
    const issuerOrg = await prisma.organization.findUniqueOrThrow({
      where: { slug: 'infosys-springboard' },
      select: { name: true },
    });

    const skillNames = track.skills.map((s) => s.skill.name);
    const expiresAt = new Date(new Date(spec.issued).getTime() + spec.validMonths * MONTH_MS);

    // Sign exactly what the original seed signed; the extra-skill tamper case
    // is applied to the stored row AFTER signing.
    const payload = {
      certificateId: spec.certificateId,
      holderName: holder.fullName,
      trackName: track.name,
      issuerName: issuerOrg.name,
      skills: skillNames,
      issuedAt: new Date(spec.issued),
      expiresAt,
      score: spec.score,
    };
    const { signature, keyId } = signCertificate(payload);

    const existing = await prisma.certificate.findUnique({
      where: { certificateId: spec.certificateId },
    });
    if (existing) {
      // Re-sign an existing row only when its stored skills still match what
      // this seed would write. A row whose skills were edited after signing is
      // a deliberate tamper demo (or a real incident) — silently fixing it
      // here would destroy the evidence the UI is meant to show.
      const storedSkills = JSON.parse(existing.skillsJson) as string[];
      const expectedSkills = [...skillNames, ...(spec.extraSkills ?? [])].sort();
      if (JSON.stringify(storedSkills.slice().sort()) === JSON.stringify(expectedSkills)) {
        await prisma.certificate.update({
          where: { id: existing.id },
          data: { signature, keyId },
        });
      }
      continue;
    }

    await prisma.certificate.create({
      data: {
        certificateId: spec.certificateId,
        status: spec.status,
        holderId,
        trackId: track.id,
        issuerOrgId: (await prisma.organization.findUniqueOrThrow({ where: { slug: 'infosys-springboard' }, select: { id: true } })).id,
        holderName: payload.holderName,
        trackName: payload.trackName,
        issuerName: payload.issuerName,
        // extraSkills ADD rows on top of the track skills — that is what makes
        // the tamper demo work: the signature covers the track skills only, so
        // the appended rows fail the integrity check.
        skillsJson: JSON.stringify([...skillNames, ...(spec.extraSkills ?? [])]),
        score: spec.score,
        issuedAt: payload.issuedAt,
        expiresAt,
        revokedAt: spec.status === 'REVOKED' ? new Date('2026-07-19T19:16:10.114Z') : null,
        revokedReason: spec.revokedReason ?? null,
        signature,
        keyId,
        onestStatus: 'PUBLISHED',
        onestPublishedAt: new Date(spec.issued),
      },
    });
  }
}

async function seedNotifications(studentId: string): Promise<void> {
  const notifications = [
    {
      type: 'CERTIFICATE',
      title: 'Certificate issued',
      body: 'Your Full Stack Developer certificate is ready to download and share.',
      link: '/student/certificates/SS-2026-4F8A-21D9',
    },
    {
      type: 'RESULT',
      title: 'Assessment passed',
      body: 'You scored 85% on React Fundamentals — well above the 60% pass mark.',
      link: '/student/courses',
    },
    {
      type: 'ELIGIBILITY',
      title: 'You are close to a certification',
      body: 'Finish PostgreSQL Essentials to become eligible for the Full Stack Developer track.',
      link: '/student/certifications',
    },
    {
      type: 'ENROLLMENT',
      title: 'Enrolled in Docker for Developers',
      body: 'Your seat is confirmed. The first module is ready when you are.',
      link: '/student/courses',
    },
  ];

  for (const n of notifications) {
    const existing = await prisma.notification.findFirst({
      where: { userId: studentId, title: n.title },
    });
    if (!existing) {
      await prisma.notification.create({ data: { userId: studentId, ...n } });
    }
  }
}

async function main(): Promise<void> {
  const idByEmail = await seedUsers();

  await seedLearning();

  // Demo learning state: completions, an in-progress course and graded attempts.
  const studentId = idByEmail.get('student@demo.test')!;
  const enrollments = [
    { slug: 'react-fundamentals', status: 'COMPLETED', progressPercent: 100 },
    { slug: 'java-basics', status: 'COMPLETED', progressPercent: 100 },
    { slug: 'postgresql-essentials', status: 'ACTIVE', progressPercent: 50 },
    { slug: 'docker-for-developers', status: 'ACTIVE', progressPercent: 0 },
  ];
  for (const e of enrollments) {
    const course = await prisma.course.findUniqueOrThrow({
      where: { slug: e.slug },
      include: { modules: { orderBy: { orderIndex: 'asc' } } },
    });
    const existing = await prisma.enrollment.findUnique({
      where: { userId_courseId: { userId: studentId, courseId: course.id } },
    });
    if (existing) continue;

    const enrollment = await prisma.enrollment.create({
      data: {
        userId: studentId,
        courseId: course.id,
        status: e.status,
        progressPercent: e.progressPercent,
      },
    });

    // Module progress consistent with the stated percentage.
    const completedCount = Math.round((e.progressPercent / 100) * course.modules.length);
    for (const module of course.modules.slice(0, completedCount)) {
      await prisma.moduleProgress.create({
        data: { enrollmentId: enrollment.id, moduleId: module.id },
      });
    }
  }

  // Two submitted attempts backing the "Latest result" screen.
  const attempts = [
    { courseSlug: 'react-fundamentals', score: 85, passed: true },
    { courseSlug: 'java-basics', score: 72, passed: true },
  ];
  for (const a of attempts) {
    const course = await prisma.course.findUniqueOrThrow({
      where: { slug: a.courseSlug },
      include: { assessments: { take: 1 } },
    });
    const assessment = course.assessments[0];
    if (!assessment) continue;
    const existing = await prisma.assessmentAttempt.findFirst({
      where: { userId: studentId, assessmentId: assessment.id, submittedAt: { not: null } },
    });
    if (existing) continue;

    await prisma.assessmentAttempt.create({
      data: {
        assessmentId: assessment.id,
        userId: studentId,
        submittedAt: new Date('2026-09-19T19:16:11.461Z'),
        score: a.score,
        passed: a.passed,
      },
    });
  }

  await seedCertificates(studentId);
  await seedNotifications(studentId);

  console.log('Demo data seeded. Password for every account: ' + DEMO_PASSWORD);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
