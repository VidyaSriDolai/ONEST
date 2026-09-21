import { describe, expect, it } from 'vitest';
import { PASSWORD_MIN_LENGTH, assessPassword } from './password.js';

/**
 * These rules are enforced by the API and mirrored by the registration form's
 * strength meter. The meter must never rate a password acceptable that the
 * server would reject, so `acceptable` is the property that matters most here.
 */
describe('assessPassword', () => {
  it('rejects a password that is too short even with every character class', () => {
    const result = assessPassword('Aa1!');
    expect(result.acceptable).toBe(false);
    expect(result.failed).toContain('length');
  });

  it('rejects a long password with no uppercase letter', () => {
    const result = assessPassword('lowercase-only-123');
    expect(result.acceptable).toBe(false);
    expect(result.failed).toContain('upper');
  });

  it('rejects a long password with no digit', () => {
    expect(assessPassword('NoDigitsInHereAtAll').acceptable).toBe(false);
  });

  it('accepts a password meeting length, case and digit rules', () => {
    const result = assessPassword('Str0ngPassword');
    expect(result.acceptable).toBe(true);
  });

  it('does not require a symbol to be acceptable', () => {
    // A symbol raises the score but is deliberately not mandatory, so
    // passphrases are not punished.
    const result = assessPassword('Str0ngPassword');
    expect(result.failed).toContain('symbol');
    expect(result.acceptable).toBe(true);
  });

  it('gives a long passphrase a bonus so it can still rate strong', () => {
    const short = assessPassword('Str0ngPass');
    const long = assessPassword('Str0ngPassphraseThatIsLong');
    expect(long.score).toBeGreaterThan(short.score);
    expect(long.strength).toBe('strong');
  });

  it('rates an empty password weak and unacceptable', () => {
    const result = assessPassword('');
    expect(result.strength).toBe('weak');
    expect(result.acceptable).toBe(false);
  });

  it('treats exactly the minimum length as long enough', () => {
    const atMinimum = 'Aa1' + 'x'.repeat(PASSWORD_MIN_LENGTH - 3);
    expect(atMinimum).toHaveLength(PASSWORD_MIN_LENGTH);
    expect(assessPassword(atMinimum).failed).not.toContain('length');
  });
});
