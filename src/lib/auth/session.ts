import {createHash, randomBytes} from "node:crypto";

import {cookies} from "next/headers";
import {cache} from "react";

import {getGuestById, type Guest} from "@/lib/data/guests";
import {getStaffById, type StaffUser} from "@/lib/data/staff";
import {nowIso, one, run} from "@/lib/db";

export type SubjectType = "staff" | "guest";

const COOKIE: Record<SubjectType, string> = {staff: "nd_staff", guest: "nd_guest"};
const TTL_SECONDS: Record<SubjectType, number> = {staff: 60 * 60 * 12, guest: 60 * 60 * 24 * 30};

const hashToken = (token: string) => createHash("sha256").update(token).digest("hex");

/**
 * Sessions are opaque random tokens; only their SHA-256 is stored, so a leaked
 * database can't be replayed as cookies. Deleting the row revokes the session.
 */
export async function startSession(type: SubjectType, subjectId: string) {
  const token = randomBytes(32).toString("base64url");
  const expires = new Date(Date.now() + TTL_SECONDS[type] * 1000);
  await run(`DELETE FROM sessions WHERE expires_at < :now`, {now: nowIso()});
  await run(`INSERT INTO sessions (token_hash, subject_type, subject_id, expires_at, created_at) VALUES (:hash, :type, :id, :expires, :now)`, {
    hash: hashToken(token),
    type,
    id: subjectId,
    expires: expires.toISOString(),
    now: nowIso(),
  });
  const store = await cookies();
  store.set(COOKIE[type], token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production" && process.env.INSECURE_COOKIES !== "true",
    path: "/",
    expires,
  });
}

export async function endSession(type: SubjectType) {
  const store = await cookies();
  const token = store.get(COOKIE[type])?.value;
  if (token) {
    await run(`DELETE FROM sessions WHERE token_hash = :hash`, {hash: hashToken(token)});
  }
  store.delete(COOKIE[type]);
}

async function resolveSubject(type: SubjectType): Promise<{id: string; tokenHash: string} | null> {
  const store = await cookies();
  const token = store.get(COOKIE[type])?.value;
  if (!token) {
    return null;
  }
  const tokenHash = hashToken(token);
  const row = await one<{subject_id: string; expires_at: string}>(
    `SELECT subject_id, expires_at FROM sessions WHERE token_hash = :hash AND subject_type = :type`,
    {hash: tokenHash, type},
  );
  if (!row || row.expires_at < nowIso()) {
    return null;
  }
  return {id: row.subject_id, tokenHash};
}

/** Current signed-in staff member (deduplicated per request), or null. */
export const getCurrentStaff = cache(async (): Promise<StaffUser | null> => {
  const subject = await resolveSubject("staff");
  const staff = subject ? await getStaffById(subject.id) : null;
  return staff?.isActive ? staff : null;
});

/** Current signed-in guest (deduplicated per request), or null. */
export const getCurrentGuest = cache(async (): Promise<Guest | null> => {
  const subject = await resolveSubject("guest");
  const guest = subject ? await getGuestById(subject.id) : null;
  return guest?.isActive ? guest : null;
});

export async function currentGuestSessionHash() {
  return (await resolveSubject("guest"))?.tokenHash ?? null;
}
