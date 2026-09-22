import bcrypt from 'bcryptjs';

/**
 * bcryptjs is pure JavaScript, so the project installs on any machine without
 * native build tooling. Swap for argon2id in production if the deploy target
 * can compile native modules.
 */
const SALT_ROUNDS = 12;

export function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, SALT_ROUNDS);
}

export function verifyPassword(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}

/**
 * Burns roughly the same CPU time as a real comparison. Called when an account
 * does not exist so response timing cannot be used to enumerate valid emails.
 */
const DUMMY_HASH = bcrypt.hashSync('timing-equalizer', SALT_ROUNDS);

export async function fakeVerify(): Promise<void> {
  await bcrypt.compare('timing-equalizer', DUMMY_HASH);
}
