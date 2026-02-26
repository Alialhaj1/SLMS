/**
 * Password Encryption Utility
 * Provides reversible encryption for admin-visible password storage.
 * Uses AES-256-CBC with a per-deployment key.
 *
 * NOTE: This is NOT a substitute for bcrypt password hashing.
 * It is used solely for the "admin can see temporary passwords" feature.
 */

import crypto from 'crypto';

const ENCRYPTION_KEY = process.env.PASSWORD_ENCRYPTION_KEY || 'slms-default-encryption-key-32ch'; // must be 32 chars
const IV_LENGTH = 16;
const ALGORITHM = 'aes-256-cbc';

/**
 * Pad or truncate the key to exactly 32 bytes.
 */
function deriveKey(raw: string): Buffer {
  return crypto.createHash('sha256').update(raw).digest(); // always 32 bytes
}

/**
 * Encrypt a plaintext password for admin-visible storage.
 */
export function encryptPassword(plaintext: string): string {
  const iv = crypto.randomBytes(IV_LENGTH);
  const key = deriveKey(ENCRYPTION_KEY);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  let encrypted = cipher.update(plaintext, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  return iv.toString('hex') + ':' + encrypted;
}

/**
 * Decrypt an encrypted password back to plaintext.
 */
export function decryptPassword(encrypted: string): string {
  const [ivHex, cipherText] = encrypted.split(':');
  if (!ivHex || !cipherText) {
    throw new Error('Invalid encrypted password format');
  }
  const iv = Buffer.from(ivHex, 'hex');
  const key = deriveKey(ENCRYPTION_KEY);
  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  let decrypted = decipher.update(cipherText, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
}
