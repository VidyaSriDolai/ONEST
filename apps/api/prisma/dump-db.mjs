/**
 * One-time recovery: dump every table from the surviving dev.db to JSON so the
 * seed files can be regenerated from real data.
 * Run from apps/api: node prisma/dump-db.mjs > prisma/seed-data.json
 */
import { PrismaClient } from '@prisma/client';
import { writeFileSync } from 'node:fs';

const prisma = new PrismaClient();

const tables = [
  'organization',
  'user',
  'skill',
  'certificationTrack',
  'trackCourse',
  'trackSkill',
  'course',
  'courseSkill',
  'coursePrerequisite',
  'module',
  'enrollment',
  'moduleProgress',
  'assessment',
  'question',
  'questionOption',
  'assessmentAttempt',
  'attemptAnswer',
  'certificate',
  'notification',
];

const dump = {};
for (const table of tables) {
  dump[table] = await prisma[table].findMany();
  console.error(`${table}: ${dump[table].length} rows`);
}

writeFileSync('prisma/seed-data.json', JSON.stringify(dump, null, 2));
console.error('written to prisma/seed-data.json');
await prisma.$disconnect();
