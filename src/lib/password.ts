import bcrypt from 'bcryptjs';
import crypto from 'node:crypto';

const SALT_ROUNDS = 12;

export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, SALT_ROUNDS);
}

export async function verifyPassword(plain: string, hashed: string): Promise<boolean> {
  return bcrypt.compare(plain, hashed);
}

/** SHA-256 hex digest of a password-reset OTP code (never store plaintext). */
export function hashResetCode(code: string): string {
  return crypto.createHash('sha256').update(code).digest('hex');
}

/** Constant-time comparison of two SHA-256 hex digests to prevent timing attacks. */
export function safeCompareHash(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(Buffer.from(a, 'hex'), Buffer.from(b, 'hex'));
}
