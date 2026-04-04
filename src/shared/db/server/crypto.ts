import {
  createCipheriv,
  createDecipheriv,
  createHash,
  createHmac,
  randomBytes,
} from 'node:crypto';
import { dataSecurityConfig } from '@/shared/config/env.server';

interface EncryptedEnvelope {
  ciphertext: string;
  iv: string;
  tag: string;
}

const encryptionKey = createHash('sha256')
  .update(dataSecurityConfig.encryptionKey, 'utf-8')
  .digest();

export const normalizeLookupInput = (value: string): string =>
  value.trim().toLowerCase();

export const createLookupHash = (value: string): string =>
  createHmac('sha256', encryptionKey)
    .update(normalizeLookupInput(value), 'utf-8')
    .digest('hex');

export const encryptJson = (value: unknown): string => {
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', encryptionKey, iv);
  const plaintext = Buffer.from(JSON.stringify(value), 'utf-8');
  const ciphertext = Buffer.concat([cipher.update(plaintext), cipher.final()]);
  const tag = cipher.getAuthTag();
  const envelope: EncryptedEnvelope = {
    ciphertext: ciphertext.toString('base64url'),
    iv: iv.toString('base64url'),
    tag: tag.toString('base64url'),
  };

  return JSON.stringify(envelope);
};

export const decryptJson = <T>(value: string): T => {
  const envelope = JSON.parse(value) as EncryptedEnvelope;
  const decipher = createDecipheriv(
    'aes-256-gcm',
    encryptionKey,
    Buffer.from(envelope.iv, 'base64url')
  );

  decipher.setAuthTag(Buffer.from(envelope.tag, 'base64url'));

  const decrypted = Buffer.concat([
    decipher.update(Buffer.from(envelope.ciphertext, 'base64url')),
    decipher.final(),
  ]);

  return JSON.parse(decrypted.toString('utf-8')) as T;
};
