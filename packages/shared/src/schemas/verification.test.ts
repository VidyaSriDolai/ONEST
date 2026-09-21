import { describe, expect, it } from 'vitest';
import {
  CERTIFICATE_ID_PATTERN,
  certificateIdSchema,
  normalizeCertificateId,
} from './verification.js';

/**
 * Employers type these off a CV or read them aloud from a printed certificate,
 * so the normaliser has to be forgiving about case, spacing and missing dashes
 * while the pattern stays strict about what actually counts as an ID.
 */
describe('normalizeCertificateId', () => {
  it('inserts the dashes when they are omitted', () => {
    expect(normalizeCertificateId('SS20264F8A21D9')).toBe('SS-2026-4F8A-21D9');
  });

  it('upper-cases a lowercase id', () => {
    expect(normalizeCertificateId('ss-2026-4f8a-21d9')).toBe('SS-2026-4F8A-21D9');
  });

  it('strips stray spaces from a pasted value', () => {
    expect(normalizeCertificateId('  SS 2026 4F8A 21D9  ')).toBe('SS-2026-4F8A-21D9');
  });

  it('leaves an already-correct id untouched', () => {
    expect(normalizeCertificateId('SS-2026-4F8A-21D9')).toBe('SS-2026-4F8A-21D9');
  });

  it('returns unrecognisable input trimmed rather than mangling it', () => {
    // The caller decides what to do with junk; the normaliser must not invent
    // a plausible-looking id out of it.
    expect(normalizeCertificateId('  hello world ')).toBe('HELLO WORLD');
  });
});

describe('CERTIFICATE_ID_PATTERN', () => {
  it('matches a well-formed id', () => {
    expect(CERTIFICATE_ID_PATTERN.test('SS-2026-4F8A-21D9')).toBe(true);
  });

  it.each([
    ['wrong prefix', 'XX-2026-4F8A-21D9'],
    ['short year', 'SS-26-4F8A-21D9'],
    ['short block', 'SS-2026-4F8-21D9'],
    ['no dashes', 'SS20264F8A21D9'],
    ['empty', ''],
  ])('rejects %s', (_label, value) => {
    expect(CERTIFICATE_ID_PATTERN.test(value)).toBe(false);
  });
});

describe('certificateIdSchema', () => {
  it('normalises case as part of parsing', () => {
    expect(certificateIdSchema.parse('ss-2026-4f8a-21d9')).toBe('SS-2026-4F8A-21D9');
  });

  it('rejects a malformed id with a helpful message', () => {
    const result = certificateIdSchema.safeParse('not-an-id');
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]?.message).toMatch(/certificate ID/i);
    }
  });

  it('rejects an empty value', () => {
    expect(certificateIdSchema.safeParse('').success).toBe(false);
  });
});
