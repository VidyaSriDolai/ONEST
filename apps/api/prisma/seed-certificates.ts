/**
 * Re-signs every certificate in the database with the CURRENT signing key.
 *
 * Run this after rotating CERT_SIGNING_* keys in .env: signatures made with
 * the old key would otherwise verify as TAMPERED. The signed payload is
 * recomputed from the snapshotted columns, so the canonical string stays
 * byte-identical — only the signature and key id change.
 *
 * Usage: npm run db:seed:certificates (or tsx prisma/seed-certificates.ts)
 */
import { PrismaClient } from '@prisma/client';
import { signCertificate } from '../src/lib/certificate-signing.js';

const prisma = new PrismaClient();

function parseSkills(json: string): string[] {
  try {
    const parsed: unknown = JSON.parse(json);
    return Array.isArray(parsed) ? parsed.filter((s): s is string => typeof s === 'string') : [];
  } catch {
    return [];
  }
}

async function main(): Promise<void> {
  const certificates = await prisma.certificate.findMany();
  let reSigned = 0;

  for (const certificate of certificates) {
    const { signature, keyId } = signCertificate({
      certificateId: certificate.certificateId,
      holderName: certificate.holderName,
      trackName: certificate.trackName,
      issuerName: certificate.issuerName,
      skills: parseSkills(certificate.skillsJson),
      issuedAt: certificate.issuedAt,
      expiresAt: certificate.expiresAt,
      score: certificate.score,
    });

    if (signature === certificate.signature && keyId === certificate.keyId) continue;

    await prisma.certificate.update({
      where: { id: certificate.id },
      data: { signature, keyId },
    });
    reSigned += 1;
  }

  console.log(`Re-signed ${reSigned} of ${certificates.length} certificates.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
