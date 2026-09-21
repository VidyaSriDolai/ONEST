/**
 * Single source of truth for product identity.
 * Rename the platform here and it propagates through the UI, emails,
 * document titles and structured data.
 */
export const BRAND = {
  name: 'SkillSeal',
  legalName: 'SkillSeal Certification Network',
  tagline: 'Industry certifications that verify in seconds.',
  description:
    'An ONEST-compliant certification platform for corporate training providers. Enroll learners, run assessments, issue tamper-evident certificates, and let any employer verify them instantly.',
  /** Public origin, used for canonical URLs, sitemaps and QR payloads. */
  url: 'https://skillseal.example.org',
  supportEmail: 'support@skillseal.example.org',
  twitter: '@skillseal',
} as const;
