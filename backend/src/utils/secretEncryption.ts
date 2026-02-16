import crypto from 'crypto';

const SECRET_ALGORITHM = 'aes-256-gcm';
const IV_LENGTH_BYTES = 12;
const KEY_LENGTH_BYTES = 32;
const KEY_SALT = 'vero-secret-encryption-v1';

function deriveKey(secret: string): Buffer {
  return crypto.scryptSync(secret, KEY_SALT, KEY_LENGTH_BYTES);
}

export function encryptSecret(plainText: string, secret: string): string {
  const iv = crypto.randomBytes(IV_LENGTH_BYTES);
  const key = deriveKey(secret);
  const cipher = crypto.createCipheriv(SECRET_ALGORITHM, key, iv);

  const encrypted = Buffer.concat([cipher.update(plainText, 'utf8'), cipher.final()]);
  const authTag = cipher.getAuthTag();

  return `v1:${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted.toString('hex')}`;
}

export function decryptSecret(payload: string, secret: string): string {
  const parts = payload.split(':');
  if (parts.length !== 4 || parts[0] !== 'v1') {
    throw new Error('Unsupported encrypted secret format');
  }

  const [, ivHex, authTagHex, encryptedHex] = parts;
  const iv = Buffer.from(ivHex, 'hex');
  const authTag = Buffer.from(authTagHex, 'hex');
  const encrypted = Buffer.from(encryptedHex, 'hex');
  const key = deriveKey(secret);
  const decipher = crypto.createDecipheriv(SECRET_ALGORITHM, key, iv);

  decipher.setAuthTag(authTag);

  const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]);
  return decrypted.toString('utf8');
}
