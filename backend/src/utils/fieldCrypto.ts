import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";
import { env } from "../config/env";

// Field-level encryption for confidential data at rest (PRD Flow 5: counselling cases).
// AES-256-GCM: a fresh 12-byte IV per value, and the auth tag makes tampering fail loudly on read.
// Stored as "enc:v1:" + base64(iv | tag | ciphertext). The version prefix allows a later key rotation.
const PREFIX = "enc:v1:";
const IV_BYTES = 12;
const TAG_BYTES = 16;
const key = Buffer.from(env.DATA_ENCRYPTION_KEY, "base64");

export const isEncrypted = (value: unknown): value is string => typeof value === "string" && value.startsWith(PREFIX);

export function encryptField(plain: string): string {
  const iv = randomBytes(IV_BYTES);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const ciphertext = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  return PREFIX + Buffer.concat([iv, cipher.getAuthTag(), ciphertext]).toString("base64");
}

// Values written before encryption existed are returned unchanged, so old records stay readable
// until `npm run counselling:encrypt` has converted them.
export function decryptField<T>(value: T): T | string {
  if (!isEncrypted(value)) return value;
  const raw = Buffer.from(value.slice(PREFIX.length), "base64");
  const decipher = createDecipheriv("aes-256-gcm", key, raw.subarray(0, IV_BYTES));
  decipher.setAuthTag(raw.subarray(IV_BYTES, IV_BYTES + TAG_BYTES));
  return Buffer.concat([decipher.update(raw.subarray(IV_BYTES + TAG_BYTES)), decipher.final()]).toString("utf8");
}

// Encrypts / decrypts the listed string fields of a plain object; other fields are copied as they are.
export function encryptFields<T extends object>(obj: T, fields: readonly (keyof T)[]): T {
  const out = { ...obj };
  for (const f of fields) {
    const v = out[f];
    if (typeof v === "string" && !isEncrypted(v)) out[f] = encryptField(v) as T[keyof T];
  }
  return out;
}

export function decryptFields<T extends object>(obj: T, fields: readonly (keyof T)[]): T {
  const out = { ...obj };
  for (const f of fields) if (out[f] !== undefined && out[f] !== null) out[f] = decryptField(out[f]) as T[keyof T];
  return out;
}
