import {randomBytes, randomInt, scryptSync, timingSafeEqual} from "node:crypto";

const N = 16384;
const R = 8;
const P = 1;
const KEYLEN = 32;

/** Format: scrypt$N$r$p$saltHex$hashHex */
export function hashPassword(password: string) {
  const salt = randomBytes(16);
  const hash = scryptSync(password, salt, KEYLEN, {N, r: R, p: P});
  return `scrypt$${N}$${R}$${P}$${salt.toString("hex")}$${hash.toString("hex")}`;
}

export function verifyPassword(password: string, encoded: string) {
  const parts = encoded.split("$");
  if (parts.length !== 6 || parts[0] !== "scrypt") {
    return false;
  }
  const [, n, r, p, saltHex, hashHex] = parts;
  const expected = Buffer.from(hashHex, "hex");
  try {
    const actual = scryptSync(password, Buffer.from(saltHex, "hex"), expected.length, {N: Number(n), r: Number(r), p: Number(p)});
    return actual.length === expected.length && timingSafeEqual(actual, expected);
  } catch {
    return false;
  }
}

/** Human-friendly temporary password, avoiding look-alike characters. */
export function generateTemporaryPassword(length = 8) {
  const alphabet = "abcdefghjkmnpqrstuvwxyzACDEFGHJKLMNPQRSTUVWXYZ23456789";
  let out = "";
  for (let index = 0; index < length; index += 1) {
    out += alphabet[randomInt(alphabet.length)];
  }
  return out;
}
