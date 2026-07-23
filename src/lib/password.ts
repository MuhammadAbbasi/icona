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

export interface PasswordValidationResult {
  valid: boolean;
  score: 'WEAK' | 'GOOD' | 'STRONG';
  message?: string;
  reasons: string[];
}

const COMMON_BLOCKLIST = [
  'password123456', '123456789012', 'admin12345678', 'icona12345678',
  'qwertyuiop12', 'letmein12345', 'welcome123456', 'pakistan12345',
  'construction12', 'master1234567', 'superadmin123',
];

export interface PasswordValidationContext {
  userName?: string;
  companyName?: string;
  email?: string;
}

/**
 * Validates password strength against NIST SP 800-63B standards:
 * - Minimum 12 characters
 * - Max 128 characters
 * - Screening against common weak/compromised patterns & user/company names
 */
export function validatePasswordStrength(
  password: string,
  context?: PasswordValidationContext
): PasswordValidationResult {
  const reasons: string[] = [];

  if (!password || typeof password !== 'string') {
    return { valid: false, score: 'WEAK', message: 'Password is required.', reasons: ['Password is required.'] };
  }

  if (password.length < 12) {
    reasons.push('Password must be at least 12 characters long (NIST standard).');
  }

  if (password.length > 128) {
    reasons.push('Password exceeds maximum allowed length of 128 characters.');
  }

  const lower = password.toLowerCase();
  if (COMMON_BLOCKLIST.some((b) => lower.includes(b))) {
    reasons.push('Password contains an easily guessable or compromised pattern.');
  }

  // Check if password contains parts of user's name, company name, or email prefix
  if (context) {
    const rawTokens = [
      ...(context.userName ? context.userName.split(/[\s._-]+/) : []),
      ...(context.companyName ? context.companyName.split(/[\s._-]+/) : []),
      ...(context.email ? context.email.split('@')[0].split(/[\s._-]+/) : []),
    ];

    const forbiddenTokens = rawTokens
      .map((t) => t.trim().toLowerCase().replace(/[^a-z0-9]/g, ''))
      .filter((t) => t.length >= 3);

    const matched = forbiddenTokens.find((token) => lower.includes(token));
    if (matched) {
      reasons.push(`Password cannot contain parts of your name or company name ("${matched}").`);
    }
  }

  const hasUpper = /[A-Z]/.test(password);
  const hasLower = /[a-z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  const hasSpecial = /[^A-Za-z0-9]/.test(password);

  let scorePoints = 0;
  if (password.length >= 12) scorePoints += 2;
  if (password.length >= 16) scorePoints += 1;
  if (hasUpper && hasLower) scorePoints += 1;
  if (hasNumber) scorePoints += 1;
  if (hasSpecial) scorePoints += 1;

  let score: 'WEAK' | 'GOOD' | 'STRONG' = 'WEAK';
  if (scorePoints >= 5) score = 'STRONG';
  else if (scorePoints >= 3) score = 'GOOD';

  const valid = reasons.length === 0;
  return {
    valid,
    score,
    message: valid ? undefined : reasons[0],
    reasons,
  };
}
