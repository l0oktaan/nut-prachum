import "server-only";
import { createHash, randomBytes, timingSafeEqual } from "node:crypto";

const ALPHABET = "abcdefghijkmnopqrstuvwxyz23456789"; // no look-alike characters

export function newSlug(length = 8): string {
  const bytes = randomBytes(length);
  let out = "";
  for (let i = 0; i < length; i++) out += ALPHABET[bytes[i] % ALPHABET.length];
  return out;
}

export const newSecret = (bytes = 24) => randomBytes(bytes).toString("base64url");

export const hashSecret = (secret: string) => createHash("sha256").update(secret).digest("hex");

export function secretMatches(secret: string, hash: string): boolean {
  const a = Buffer.from(hashSecret(secret), "hex");
  const b = Buffer.from(hash, "hex");
  return a.length === b.length && timingSafeEqual(a, b);
}
