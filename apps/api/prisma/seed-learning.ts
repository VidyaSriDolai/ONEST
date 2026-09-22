/**
 * Learning content: skills, courses, modules, assessments and certification
 * tracks — reconstructed from the original seed's output (recovered via
 * prisma/seed-data.json after the source was lost).
 *
 * Idempotent: deletes and re-creates the demo content on every run.
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const PROVIDER_ORG = 'infosys-springboard';

const skills = [
  { name: 'React', slug: 'react', sfiaCode: 'PROG' },
  { name: 'Node.js', slug: 'nodejs', sfiaCode: 'PROG' },
  { name: 'REST APIs', slug: 'rest-apis', sfiaCode: 'DTAN' },
  { name: 'PostgreSQL', slug: 'postgresql', sfiaCode: 'DBAD' },
  { name: 'SQL', slug: 'sql', sfiaCode: 'DBAD' },
  { name: 'Docker', slug: 'docker', sfiaCode: 'SYSP' },
  { name: 'CI/CD', slug: 'ci-cd', sfiaCode: 'RELM' },
  { name: 'Kubernetes', slug: 'kubernetes', sfiaCode: 'SYSP' },
];

interface ModuleSpec {
  title: string;
  content: string;
  durationMinutes: number;
}

interface QuestionSpec {
  text: string;
  marks: number;
  options: Array<{ text: string; isCorrect: boolean }>;
}

interface AssessmentSpec {
  title: string;
  passingScore: number;
  timeLimitMinutes: number;
  maxAttempts: number;
  isPublished: boolean;
  questions: QuestionSpec[];
}

interface CourseSpec {
  slug: string;
  title: string;
  description: string;
  category: string;
  level: string;
  durationHours: number;
  rating: number;
  skills: string[];
  modules: ModuleSpec[];
  prerequisites?: string[];
  assessment: AssessmentSpec;
}

const courses: CourseSpec[] = [
  {
    slug: 'java-basics',
    title: 'Java Basics',
    description:
      'Syntax, types, control flow and object-oriented fundamentals. The entry point for every backend track.',
    category: 'Programming',
    level: 'BEGINNER',
    durationHours: 12,
    rating: 4.6,
    skills: ['Node.js'],
    modules: [
      { title: 'Variables and types', content: 'Primitives, references, and when each is used.', durationMinutes: 15 },
      { title: 'Control flow', content: 'Branching, loops, and the switch expression.', durationMinutes: 15 },
      { title: 'Classes and objects', content: 'Constructors, fields, methods and encapsulation.', durationMinutes: 15 },
      { title: 'Collections', content: 'List, Set and Map, and choosing between them.', durationMinutes: 15 },
    ],
    assessment: {
      title: 'Java Basics — final assessment',
      passingScore: 60,
      timeLimitMinutes: 20,
      maxAttempts: 3,
      isPublished: true,
      questions: [
        {
          text: 'Which keyword prevents a class from being subclassed?',
          marks: 1,
          options: [
            { text: 'final', isCorrect: true },
            { text: 'static', isCorrect: false },
            { text: 'sealed', isCorrect: false },
            { text: 'private', isCorrect: false },
          ],
        },
        {
          text: 'What is the default value of an uninitialised int field?',
          marks: 1,
          options: [
            { text: 'null', isCorrect: false },
            { text: '0', isCorrect: true },
            { text: 'undefined', isCorrect: false },
            { text: 'It is a compile error', isCorrect: false },
          ],
        },
        {
          text: 'Which collection guarantees no duplicate elements?',
          marks: 1,
          options: [
            { text: 'List', isCorrect: false },
            { text: 'Map', isCorrect: false },
            { text: 'Set', isCorrect: true },
            { text: 'Queue', isCorrect: false },
          ],
        },
        {
          text: 'What does the JVM do with an object that has no references?',
          marks: 1,
          options: [
            { text: 'Throws an error', isCorrect: false },
            { text: 'Keeps it until shutdown', isCorrect: false },
            { text: 'Makes it eligible for garbage collection', isCorrect: true },
            { text: 'Copies it to the stack', isCorrect: false },
          ],
        },
        {
          text: 'Which access modifier makes a member visible only within its own class?',
          marks: 1,
          options: [
            { text: 'protected', isCorrect: false },
            { text: 'public', isCorrect: false },
            { text: 'package-private', isCorrect: false },
            { text: 'private', isCorrect: true },
          ],
        },
      ],
    },
  },
  {
    slug: 'react-fundamentals',
    title: 'React Fundamentals',
    description: 'Components, state and effects. Build interfaces that stay predictable as they grow.',
    category: 'Frontend',
    level: 'INTERMEDIATE',
    durationHours: 16,
    rating: 4.8,
    skills: ['React'],
    modules: [
      { title: 'Components and props', content: 'Composition, and why props flow one way.', durationMinutes: 15 },
      { title: 'State and events', content: 'useState, and keeping state where it belongs.', durationMinutes: 15 },
      { title: 'Effects', content: 'useEffect, dependencies, and cleanup.', durationMinutes: 15 },
      { title: 'Lists and keys', content: 'Rendering collections without surprising bugs.', durationMinutes: 15 },
      { title: 'Forms', content: 'Controlled inputs and validation.', durationMinutes: 15 },
    ],
    assessment: {
      title: 'React Fundamentals — final assessment',
      passingScore: 60,
      timeLimitMinutes: 25,
      maxAttempts: 3,
      isPublished: true,
      questions: [
        {
          text: 'What does the dependency array of useEffect control?',
          marks: 1,
          options: [
            { text: 'The order effects run in', isCorrect: false },
            { text: 'When the effect re-runs', isCorrect: true },
            { text: 'Which component owns the effect', isCorrect: false },
            { text: 'Whether the effect is async', isCorrect: false },
          ],
        },
        {
          text: 'Why should list keys be stable and unique?',
          marks: 1,
          options: [
            { text: 'So React can match elements across renders', isCorrect: true },
            { text: 'To improve SEO', isCorrect: false },
            { text: 'They are required by TypeScript', isCorrect: false },
            { text: 'To sort the list automatically', isCorrect: false },
          ],
        },
        {
          text: 'What makes an input "controlled"?',
          marks: 1,
          options: [
            { text: 'It has a ref', isCorrect: false },
            { text: 'It is inside a form element', isCorrect: false },
            { text: 'Its value comes from state', isCorrect: true },
            { text: 'It is marked required', isCorrect: false },
          ],
        },
        {
          text: 'Props in React are:',
          marks: 1,
          options: [
            { text: 'Mutable by the child', isCorrect: false },
            { text: 'Read-only in the child', isCorrect: true },
            { text: 'Global', isCorrect: false },
            { text: 'Always strings', isCorrect: false },
          ],
        },
      ],
    },
  },
  {
    slug: 'rest-api-design',
    title: 'REST API Design',
    description:
      'Resources, status codes, versioning and pagination — designing APIs other teams enjoy using.',
    category: 'Backend',
    level: 'INTERMEDIATE',
    durationHours: 14,
    rating: 4.5,
    skills: ['REST APIs'],
    prerequisites: ['java-basics'],
    modules: [
      { title: 'Resources and URIs', content: 'Modelling nouns, not verbs.', durationMinutes: 15 },
      { title: 'Status codes', content: 'Saying precisely what happened.', durationMinutes: 15 },
      { title: 'Pagination and filtering', content: 'Keeping large collections usable.', durationMinutes: 15 },
      { title: 'Versioning', content: 'Changing an API without breaking clients.', durationMinutes: 15 },
    ],
    assessment: {
      title: 'REST API Design — final assessment',
      passingScore: 65,
      timeLimitMinutes: 20,
      maxAttempts: 3,
      isPublished: true,
      questions: [
        {
          text: 'Which status code fits a successful POST that created a resource?',
          marks: 1,
          options: [
            { text: '200 OK', isCorrect: false },
            { text: '201 Created', isCorrect: true },
            { text: '204 No Content', isCorrect: false },
            { text: '302 Found', isCorrect: false },
          ],
        },
        {
          text: 'A request that is well-formed but semantically invalid should return:',
          marks: 1,
          options: [
            { text: '400 Bad Request', isCorrect: false },
            { text: '404 Not Found', isCorrect: false },
            { text: '422 Unprocessable Entity', isCorrect: true },
            { text: '500', isCorrect: false },
          ],
        },
        {
          text: 'Which is the most RESTful path for one user’s orders?',
          marks: 1,
          options: [
            { text: '/getUserOrders?id=7', isCorrect: false },
            { text: '/users/7/orders', isCorrect: true },
            { text: '/orders/getByUser/7', isCorrect: false },
            { text: '/api?action=orders&user=7', isCorrect: false },
          ],
        },
        {
          text: 'Idempotent means:',
          marks: 1,
          options: [
            { text: 'The request is cached', isCorrect: false },
            { text: 'Repeating it has the same effect as doing it once', isCorrect: true },
            { text: 'It requires authentication', isCorrect: false },
            { text: 'It returns JSON', isCorrect: false },
          ],
        },
      ],
    },
  },
  {
    slug: 'postgresql-essentials',
    title: 'PostgreSQL Essentials',
    description: 'Schema design, indexing and query planning — making relational data fast and correct.',
    category: 'Databases',
    level: 'INTERMEDIATE',
    durationHours: 18,
    rating: 4.7,
    skills: ['PostgreSQL', 'SQL'],
    modules: [
      { title: 'Schema design', content: 'Normalisation, keys and constraints.', durationMinutes: 15 },
      { title: 'Indexes', content: 'B-tree, partial and composite indexes.', durationMinutes: 15 },
      { title: 'Query planning', content: 'Reading EXPLAIN ANALYZE output.', durationMinutes: 15 },
      { title: 'Transactions', content: 'Isolation levels and locking.', durationMinutes: 15 },
    ],
    assessment: {
      title: 'PostgreSQL Essentials — final assessment',
      passingScore: 60,
      timeLimitMinutes: 25,
      maxAttempts: 3,
      isPublished: true,
      questions: [
        {
          text: 'Which index type does PostgreSQL create by default?',
          marks: 1,
          options: [
            { text: 'Hash', isCorrect: false },
            { text: 'GIN', isCorrect: false },
            { text: 'B-tree', isCorrect: true },
            { text: 'BRIN', isCorrect: false },
          ],
        },
        {
          text: 'EXPLAIN ANALYZE differs from EXPLAIN because it:',
          marks: 1,
          options: [
            { text: 'Actually runs the query', isCorrect: true },
            { text: 'Only works on SELECT', isCorrect: false },
            { text: 'Rewrites the query', isCorrect: false },
            { text: 'Requires superuser', isCorrect: false },
          ],
        },
        {
          text: 'A foreign key primarily enforces:',
          marks: 1,
          options: [
            { text: 'Uniqueness', isCorrect: false },
            { text: 'Referential integrity', isCorrect: true },
            { text: 'Sort order', isCorrect: false },
            { text: 'Encryption', isCorrect: false },
          ],
        },
      ],
    },
  },
  {
    slug: 'docker-for-developers',
    title: 'Docker for Developers',
    description: 'Images, layers and Compose — shipping the same environment everywhere.',
    category: 'DevOps',
    level: 'BEGINNER',
    durationHours: 10,
    rating: 4.4,
    skills: ['Docker'],
    modules: [
      { title: 'Images and containers', content: 'The difference, and why it matters.', durationMinutes: 15 },
      { title: 'Writing a Dockerfile', content: 'Layers, caching and image size.', durationMinutes: 15 },
      { title: 'Docker Compose', content: 'Running multi-service stacks locally.', durationMinutes: 15 },
    ],
    assessment: {
      title: 'Docker for Developers — final assessment',
      passingScore: 60,
      timeLimitMinutes: 15,
      maxAttempts: 3,
      isPublished: true,
      questions: [
        {
          text: 'A Docker image is best described as:',
          marks: 1,
          options: [
            { text: 'A running process', isCorrect: false },
            { text: 'A read-only template for containers', isCorrect: true },
            { text: 'A virtual machine', isCorrect: false },
            { text: 'A network bridge', isCorrect: false },
          ],
        },
        {
          text: 'Why put rarely-changing instructions early in a Dockerfile?',
          marks: 1,
          options: [
            { text: 'To reduce image size', isCorrect: false },
            { text: 'To maximise layer cache reuse', isCorrect: true },
            { text: 'It is required syntax', isCorrect: false },
            { text: 'To speed up networking', isCorrect: false },
          ],
        },
        {
          text: 'docker compose up primarily:',
          marks: 1,
          options: [
            { text: 'Builds a single image', isCorrect: false },
            { text: 'Starts the services defined in a compose file', isCorrect: true },
            { text: 'Pushes to a registry', isCorrect: false },
            { text: 'Prunes unused volumes', isCorrect: false },
          ],
        },
      ],
    },
  },
];

const tracks = [
  {
    slug: 'full-stack-developer',
    name: 'Full Stack Developer',
    description:
      'End-to-end web development: building interfaces, designing APIs and modelling relational data.',
    nsqfLevel: 6,
    validityMonths: 36,
    minimumScore: 60,
    courses: ['java-basics', 'react-fundamentals', 'rest-api-design', 'postgresql-essentials'],
    skills: ['React', 'Node.js', 'REST APIs', 'PostgreSQL'],
  },
  {
    slug: 'cloud-devops-engineer',
    name: 'Cloud & DevOps Engineer',
    description:
      'Containerised delivery: packaging services, automating pipelines and operating them in production.',
    nsqfLevel: 6,
    validityMonths: 24,
    minimumScore: 60,
    courses: ['docker-for-developers'],
    skills: ['Docker', 'CI/CD', 'Kubernetes'],
  },
];

/** Filled during course creation; used by the track pass below. */
const courseIdBySlug = new Map<string, string>();

export default async function seedLearning(): Promise<void> {
  const org = await prisma.organization.findUniqueOrThrow({
    where: { slug: PROVIDER_ORG },
    select: { id: true },
  });

  // Reference data is shared, so upsert rather than delete.
  for (const skill of skills) {
    await prisma.skill.upsert({
      where: { slug: skill.slug },
      update: { name: skill.name, sfiaCode: skill.sfiaCode },
      create: skill,
    });
  }
  const skillIdByName = new Map(
    (await prisma.skill.findMany()).map((s) => [s.name, s.id]),
  );

  for (const course of courses) {
    const existing = await prisma.course.findUnique({ where: { slug: course.slug } });
    if (existing) continue; // already seeded; db:reset clears and re-runs
    const createdCourse = await prisma.course.create({
      data: {
        slug: course.slug,
        title: course.title,
        description: course.description,
        category: course.category,
        level: course.level,
        durationHours: course.durationHours,
        rating: course.rating,
        isPublished: true,
        providerOrgId: org.id,
        skills: {
          create: course.skills.map((name) => ({ skillId: skillIdByName.get(name)! })),
        },
        modules: {
          create: course.modules.map((m, index) => ({ ...m, orderIndex: index })),
        },
        assessments: {
          create: {
            title: course.assessment.title,
            passingScore: course.assessment.passingScore,
            timeLimitMinutes: course.assessment.timeLimitMinutes,
            maxAttempts: course.assessment.maxAttempts,
            isPublished: course.assessment.isPublished,
            questions: {
              create: course.assessment.questions.map((q, index) => ({
                text: q.text,
                orderIndex: index,
                marks: q.marks,
                options: {
                  create: q.options.map((o, optionIndex) => ({
                    text: o.text,
                    isCorrect: o.isCorrect,
                    orderIndex: optionIndex,
                  })),
                },
              })),
            },
          },
        },
      },
    });
    courseIdBySlug.set(course.slug, createdCourse.id);
  }

  // Second pass: prerequisites (courses now all exist).
  for (const course of courses) {
    if (!course.prerequisites?.length) continue;
    const created = await prisma.course.findUniqueOrThrow({
      where: { slug: course.slug },
      select: { id: true },
    });
    for (const prereqSlug of course.prerequisites) {
      const prereq = await prisma.course.findUniqueOrThrow({
        where: { slug: prereqSlug },
        select: { id: true },
      });
      const existing = await prisma.coursePrerequisite.findFirst({
        where: { courseId: created.id, prerequisiteId: prereq.id },
      });
      if (!existing) {
        await prisma.coursePrerequisite.create({
          data: { courseId: created.id, prerequisiteId: prereq.id },
        });
      }
    }
  }

  for (const track of tracks) {
    const existing = await prisma.certificationTrack.findUnique({ where: { slug: track.slug } });
    if (existing) continue;
    await prisma.certificationTrack.create({
      data: {
        slug: track.slug,
        name: track.name,
        description: track.description,
        nsqfLevel: track.nsqfLevel,
        validityMonths: track.validityMonths,
        minimumScore: track.minimumScore,
        isActive: true,
        issuerOrgId: org.id,
        courses: {
          create: track.courses.map((slug) => ({ courseId: courseIdBySlug.get(slug)! })),
        },
        skills: {
          create: track.skills.map((name) => ({ skillId: skillIdByName.get(name)! })),
        },
      },
    });
  }

  console.log('Learning content seeded.');
}
