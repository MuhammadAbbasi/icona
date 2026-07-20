import crypto from 'node:crypto';

// Derive a 32-byte key from NEXTAUTH_SECRET or MOBILE_JWT_SECRET. No hardcoded
// fallback: a literal string checked into a public repo would let anyone who
// reads the source decrypt every stored integration token. NEXTAUTH_SECRET is
// already a required env var for the whole app, so this should never actually
// throw in a correctly configured deployment - failing loudly here beats
// silently encrypting secrets with a key an attacker already has.
const MASTER_SECRET = process.env.NEXTAUTH_SECRET || process.env.MOBILE_JWT_SECRET;
if (!MASTER_SECRET) {
  throw new Error('crypto.ts: NEXTAUTH_SECRET or MOBILE_JWT_SECRET must be set to encrypt/decrypt stored secrets.');
}
const KEY = crypto.createHash('sha256').update(MASTER_SECRET).digest();

const ALGORITHM = 'aes-256-gcm';
const MASK_PREFIX = '••••••••';

/**
 * Encrypts sensitive secret tokens (Telegram Bot Tokens, Meta Access Tokens, Notion Keys)
 * before persisting to the database.
 */
export function encryptSecret(plainText: string): string {
  if (!plainText || plainText.startsWith('enc:v1:') || plainText.startsWith(MASK_PREFIX)) {
    return plainText; // Already encrypted or placeholder
  }

  try {
    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv(ALGORITHM, KEY, iv);
    const encrypted = Buffer.concat([cipher.update(plainText, 'utf8'), cipher.final()]);
    const authTag = cipher.getAuthTag();

    return `enc:v1:${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted.toString('hex')}`;
  } catch (err) {
    console.error('[encryptSecret] Failed to encrypt secret:', err);
    return plainText;
  }
}

/**
 * Decrypts AES-256-GCM encrypted tokens for backend API requests.
 */
export function decryptSecret(cipherText: string): string {
  if (!cipherText || !cipherText.startsWith('enc:v1:')) {
    return cipherText;
  }

  try {
    const parts = cipherText.split(':');
    if (parts.length !== 5) return cipherText;

    const iv = Buffer.from(parts[2], 'hex');
    const authTag = Buffer.from(parts[3], 'hex');
    const encryptedText = Buffer.from(parts[4], 'hex');

    const decipher = crypto.createDecipheriv(ALGORITHM, KEY, iv);
    decipher.setAuthTag(authTag);

    const decrypted = Buffer.concat([decipher.update(encryptedText), decipher.final()]);
    return decrypted.toString('utf8');
  } catch (err) {
    console.error('[decryptSecret] Failed to decrypt secret:', err);
    return cipherText;
  }
}

/**
 * Returns a masked representation of the secret for client UI rendering.
 * Never exposes raw secret tokens in API responses or HTML DOM values.
 */
export function maskSecret(secret: string): string {
  if (!secret) return '';

  const plain = decryptSecret(secret);
  if (!plain) return '';

  if (plain.length <= 8) {
    return `${MASK_PREFIX}${plain.slice(-2)}`;
  }
  return `${MASK_PREFIX}${plain.slice(-4)}`;
}
