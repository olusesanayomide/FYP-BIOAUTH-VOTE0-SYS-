import crypto from 'crypto';

const ALGORITHM = 'aes-256-cbc';
const ENCODING = 'hex';
const KEY = process.env.ENCRYPTION_KEY;

if (!KEY || KEY.length !== 64) {
  throw new Error('ENCRYPTION_KEY must be a 32-byte (64 hex character) string');
}

/**
 * Encrypt sensitive data (WebAuthn credentials, biometric data)
 * @param data - Data to encrypt
 * @returns Encrypted data and IV
 */
export const encryptData = (data: string): { encrypted: string; iv: string } => {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(ALGORITHM, Buffer.from(KEY!, ENCODING), iv);

  let encrypted = cipher.update(data, 'utf8', ENCODING);
  encrypted += cipher.final(ENCODING);

  return {
    encrypted,
    iv: iv.toString(ENCODING),
  };
};

/**
 * Decrypt sensitive data
 * @param encrypted - Encrypted data
 * @param iv - Initialization vector
 * @returns Decrypted data
 */
export const decryptData = (encrypted: string, iv: string): string => {
  const decipher = crypto.createDecipheriv(
    ALGORITHM,
    Buffer.from(KEY!, ENCODING),
    Buffer.from(iv, ENCODING),
  );

  let decrypted = decipher.update(encrypted, ENCODING, 'utf8');
  decrypted += decipher.final('utf8');

  return decrypted;
};

/**
 * Generate a random encryption key (run once and save to .env)
 */
export const generateEncryptionKey = (): string => {
  return crypto.randomBytes(32).toString('hex');
};
