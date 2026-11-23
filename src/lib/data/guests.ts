import {parsePhoneNumberFromString} from "libphonenumber-js";

import {hashPassword, generateTemporaryPassword, verifyPassword} from "@/lib/auth/password";
import {currentEventYear, recordAttendance} from "@/lib/data/attendance";
import {audit, type Actor} from "@/lib/data/audit";
import {removeGuestPhotoFiles} from "@/lib/data/photos";
import {many, newId, nowIso, one, run, transaction} from "@/lib/db";
import {AppError} from "@/lib/errors";

export type GuestSource = "self" | "reception" | "admin" | "seed" | "online";

/** Who a guest is. Online applicants choose it; desk registrations default to visitor. */
export const GUEST_CATEGORIES = ["student", "visitor", "graduate", "staff"] as const;
export type GuestCategory = (typeof GUEST_CATEGORIES)[number];

export type Guest = {
  id: string;
  code: string;
  fullName: string;
  /** Null for family children and for students/staff who registered without a phone. */
  phone: string | null;
  email: string | null;
  notes: string | null;
  isActive: boolean;
  source: GuestSource;
  category: GuestCategory;
  /** The online application this guest came from (shared by a whole family). */
  registrationId: string | null;
  /** False for children in a family: they have their own Guest ID but no sign-in. */
  isAccountHolder: boolean;
  checkedInAt: string | null;
  checkedInBy: string | null;
  createdAt: string;
  updatedAt: string;
};

type GuestRow = {
  id: string;
  code: string;
  full_name: string;
  phone: string | null;
  email: string | null;
  notes: string | null;
  password_hash: string | null;
  is_active: number;
  source: GuestSource;
  category: GuestCategory;
  registration_id: string | null;
  is_account_holder: number;
  checked_in_at: string | null;
  checked_in_by: string | null;
  created_at: string;
  updated_at: string;
};

const COLUMNS = "id, code, full_name, phone, email, notes, password_hash, is_active, source, category, registration_id, is_account_holder, checked_in_at, checked_in_by, created_at, updated_at";

function toGuest(row: GuestRow): Guest {
  return {
    id: row.id,
    code: row.code,
    fullName: row.full_name,
    phone: row.phone,
    email: row.email,
    notes: row.notes,
    isActive: row.is_active === 1,
    source: row.source,
    category: row.category,
    registrationId: row.registration_id,
    isAccountHolder: row.is_account_holder === 1,
    checkedInAt: row.checked_in_at,
    checkedInBy: row.checked_in_by,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/**
 * Normalizes a phone number to E.164 (+97333001122). Numbers without a country code are read as
 * Bahraini. Works for every country (libphonenumber); returns null if it isn't a valid number.
 * Lenient on purpose for sign-in lookups: a plausible "+<8–15 digits>" is accepted too.
 */
export function normalizePhone(input: string): string | null {
  const strict = normalizeInternationalPhone(input);
  if (strict) return strict;
  let value = input.replace(/[\s\-().]/g, "");
  if (value.startsWith("00")) value = `+${value.slice(2)}`;
  if (/^\d{8}$/.test(value)) value = `+973${value}`;
  if (!value.startsWith("+")) value = `+${value}`;
  return /^\+\d{8,15}$/.test(value) ? value : null;
}

/** Strict: a number that is valid in its country (any country). Used for new registrations. */
export function normalizeInternationalPhone(input: string): string | null {
  const value = input.trim().replace(/^00/, "+");
  if (!value) return null;
  const parsed = parsePhoneNumberFromString(value, "BH");
  return parsed && parsed.isValid() ? parsed.number : null;
}

export const normalizeEmail = (input: string) => input.trim().toLowerCase();

/** Accepts "G-1001", "g1001", "1001" or a scanned QR payload like "NDG:G-1001". */
export function normalizeGuestCode(input: string): string {
  const value = input.trim().toUpperCase().replace(/^NDG:/, "");
  const digits = value.replace(/^G-?/, "");
  return /^\d+$/.test(digits) ? `G-${digits}` : value;
}

async function rowByCode(code: string) {
  return await one<GuestRow>(`SELECT ${COLUMNS} FROM guests WHERE code = :code`, {code: normalizeGuestCode(code)});
}

export async function getGuestById(id: string): Promise<Guest | null> {
  const row = await one<GuestRow>(`SELECT ${COLUMNS} FROM guests WHERE id = :id`, {id});
  return row ? toGuest(row) : null;
}

export async function getGuestByCode(code: string): Promise<Guest | null> {
  const row = await rowByCode(code);
  return row ? toGuest(row) : null;
}

/** Looks a guest up by code or phone and verifies the password. */
export async function authenticateGuest(identifier: string, password: string): Promise<Guest> {
  const row = await findSignInRow(identifier);

  // Always run a hash comparison so response time doesn't reveal whether the account exists.
  // Family children have no password: they can't sign in.
  const valid = verifyPassword(password, row?.password_hash ?? DUMMY_HASH) && Boolean(row?.password_hash);
  if (!row || !valid) {
    throw new AppError("invalidCredentials");
  }
  if (row.is_active !== 1) {
    throw new AppError("accountInactive");
  }
  return toGuest(row);
}

const DUMMY_HASH = hashPassword("not-a-real-password");

/** A guest by Guest ID, email address or phone number (whichever the identifier looks like). */
async function findSignInRow(identifier: string) {
  const value = identifier.trim();
  if (value.includes("@")) {
    return one<GuestRow>(`SELECT ${COLUMNS} FROM guests WHERE lower(email) = :email`, {email: normalizeEmail(value)});
  }
  const byCode = await rowByCode(value);
  if (byCode) return byCode;
  const phone = normalizePhone(value);
  return phone ? one<GuestRow>(`SELECT ${COLUMNS} FROM guests WHERE phone = :phone`, {phone}) : null;
}

export type GuestFilter = {query?: string; status?: "all" | "active" | "inactive" | "checked-in" | "not-checked-in"; limit?: number; offset?: number};

export async function listGuests({query = "", status = "all", limit = 25, offset = 0}: GuestFilter = {}) {
  const clauses: string[] = [];
  const params: Record<string, string | number> = {limit, offset};

  if (query.trim()) {
    clauses.push("(full_name LIKE :q OR code LIKE :q OR phone LIKE :q OR email LIKE :q)");
    params.q = `%${query.trim().replace(/[%_]/g, "")}%`;
  }
  if (status === "active") clauses.push("is_active = 1");
  if (status === "inactive") clauses.push("is_active = 0");
  if (status === "checked-in") clauses.push("checked_in_at IS NOT NULL");
  if (status === "not-checked-in") clauses.push("checked_in_at IS NULL");

  const where = clauses.length ? `WHERE ${clauses.join(" AND ")}` : "";
  const {limit: _limit, offset: _offset, ...countParams} = params;
  void _limit;
  void _offset;

  const rows = await many<GuestRow>(`SELECT ${COLUMNS} FROM guests ${where} ORDER BY created_at DESC, code DESC LIMIT :limit OFFSET :offset`, params);
  const total = (await one<{n: number}>(`SELECT COUNT(*) AS n FROM guests ${where}`, countParams))?.n ?? 0;
  return {total, guests: rows.map(toGuest)};
}

async function nextGuestCode() {
  const row = await one<{max: number | null}>(`SELECT MAX(CAST(SUBSTR(code, 3) AS INTEGER)) AS max FROM guests WHERE code LIKE 'G-%'`);
  return `G-${Math.max(1000, row?.max ?? 1000) + 1}`;
}

export type NewGuestInput = {
  fullName: string;
  phone: string;
  email?: string | null;
  notes?: string | null;
  /** If omitted, a temporary password is generated and returned. */
  password?: string;
  source: Exclude<GuestSource, "seed">;
  category?: GuestCategory;
  checkIn?: boolean;
};

export async function createGuest(input: NewGuestInput, actor: Actor): Promise<{guest: Guest; temporaryPassword: string | null}> {
  const phone = normalizePhone(input.phone);
  if (!phone) {
    throw new AppError("invalidInput");
  }
  const temporaryPassword = input.password ? null : generateTemporaryPassword();
  const passwordHash = hashPassword(input.password ?? temporaryPassword!);

  return transaction(async () => {
    if (await one(`SELECT 1 FROM guests WHERE phone = :phone`, {phone})) {
      throw new AppError("phoneTaken");
    }
    const email = input.email?.trim() ? normalizeEmail(input.email) : null;
    if (email && (await one(`SELECT 1 FROM guests WHERE lower(email) = :email`, {email}))) {
      throw new AppError("emailTaken");
    }
    const now = nowIso();
    const id = newId();
    const code = await nextGuestCode();
    await run(
      `INSERT INTO guests (id, code, full_name, phone, email, notes, password_hash, is_active, source, category, checked_in_at, checked_in_by, created_at, updated_at)
       VALUES (:id, :code, :fullName, :phone, :email, :notes, :passwordHash, 1, :source, :category, :checkedInAt, :checkedInBy, :now, :now)`,
      {
        id,
        code,
        category: input.category ?? "visitor",
        fullName: input.fullName.trim(),
        phone,
        email,
        notes: input.notes?.trim() || null,
        passwordHash,
        source: input.source,
        checkedInAt: input.checkIn ? now : null,
        checkedInBy: input.checkIn ? actor.name : null,
        now,
      },
    );
    await audit(actor, "guest.registered", `${input.fullName.trim()} (${code}) via ${input.source}${input.checkIn ? ", checked in" : ""}`);
    if (input.checkIn) await recordAttendance(id, await currentEventYear(), "checkin", actor);
    return {guest: (await getGuestById(id))!, temporaryPassword};
  });
}

export async function updateGuest(
  id: string,
  patch: {fullName: string; phone?: string | null; email?: string | null; notes?: string | null},
  actor: Actor,
): Promise<Guest> {
  const phone = patch.phone?.trim() ? normalizePhone(patch.phone) : null;
  if (patch.phone?.trim() && !phone) {
    throw new AppError("invalidInput");
  }
  const email = patch.email?.trim() ? normalizeEmail(patch.email) : null;
  return transaction(async () => {
    const current = await getGuestById(id);
    if (!current) {
      throw new AppError("guestNotFound");
    }
    if (phone && (await one(`SELECT 1 FROM guests WHERE phone = :phone AND id != :id`, {phone, id}))) {
      throw new AppError("phoneTaken");
    }
    if (email && (await one(`SELECT 1 FROM guests WHERE lower(email) = :email AND id != :id`, {email, id}))) {
      throw new AppError("emailTaken");
    }
    await run(
      `UPDATE guests SET full_name = :fullName, phone = :phone, email = :email, notes = :notes, updated_at = :now WHERE id = :id`,
      {id, fullName: patch.fullName.trim(), phone, email, notes: patch.notes?.trim() || null, now: nowIso()},
    );
    await audit(actor, "guest.updated", `${current.code}`);
    return (await getGuestById(id))!;
  });
}

/** Guest self-service update: contact details only. */
export async function updateOwnContact(id: string, patch: {phone: string; email?: string | null}) {
  const guest = await getGuestById(id);
  if (!guest) {
    throw new AppError("guestNotFound");
  }
  return await updateGuest(id, {fullName: guest.fullName, phone: patch.phone, email: patch.email, notes: guest.notes}, {type: "guest", id, name: guest.fullName});
}

export async function setGuestActive(id: string, active: boolean, actor: Actor) {
  await transaction(async () => {
    const guest = await getGuestById(id);
    if (!guest) {
      throw new AppError("guestNotFound");
    }
    await run(`UPDATE guests SET is_active = :active, updated_at = :now WHERE id = :id`, {id, active: active ? 1 : 0, now: nowIso()});
    if (!active) {
      await run(`DELETE FROM sessions WHERE subject_type = 'guest' AND subject_id = :id`, {id});
    }
    await audit(actor, active ? "guest.activated" : "guest.deactivated", guest.code);
  });
}

export async function deleteGuest(id: string, actor: Actor) {
  await transaction(async () => {
    const guest = await getGuestById(id);
    if (!guest) {
      throw new AppError("guestNotFound");
    }
    await run(`DELETE FROM sessions WHERE subject_type = 'guest' AND subject_id = :id`, {id});
    await removeGuestPhotoFiles(id);
    // Linked rows are removed explicitly rather than relying on foreign-key cascades, which
    // aren't enabled the same way everywhere. Past draws keep the winner's code and name.
    await run(`DELETE FROM photo_submissions WHERE guest_id = :id`, {id});
    await run(`DELETE FROM game_results WHERE guest_id = :id`, {id});
    await run(`DELETE FROM attendance WHERE guest_id = :id`, {id});
    await run(`DELETE FROM winner_announcements WHERE guest_id = :id`, {id});
    await run(`UPDATE grand_prize_draws SET guest_id = NULL WHERE guest_id = :id`, {id});
    await run(`DELETE FROM guests WHERE id = :id`, {id});
    await audit(actor, "guest.deleted", `${guest.fullName} (${guest.code})`);
  });
}

export async function resetGuestPassword(id: string, actor: Actor): Promise<string> {
  const temporaryPassword = generateTemporaryPassword();
  await transaction(async () => {
    const guest = await getGuestById(id);
    if (!guest) {
      throw new AppError("guestNotFound");
    }
    await run(`UPDATE guests SET password_hash = :hash, updated_at = :now WHERE id = :id`, {id, hash: hashPassword(temporaryPassword), now: nowIso()});
    await run(`DELETE FROM sessions WHERE subject_type = 'guest' AND subject_id = :id`, {id});
    await audit(actor, "guest.password_reset", guest.code);
  });
  return temporaryPassword;
}

export async function changeGuestPassword(id: string, currentPassword: string, nextPassword: string, keepSessionHash: string | null) {
  const row = await one<GuestRow>(`SELECT ${COLUMNS} FROM guests WHERE id = :id`, {id});
  if (!row) {
    throw new AppError("guestNotFound");
  }
  if (!row.password_hash || !verifyPassword(currentPassword, row.password_hash)) {
    throw new AppError("wrongPassword");
  }
  await transaction(async () => {
    await run(`UPDATE guests SET password_hash = :hash, updated_at = :now WHERE id = :id`, {id, hash: hashPassword(nextPassword), now: nowIso()});
    // Sign out other devices, keep the current one.
    await run(`DELETE FROM sessions WHERE subject_type = 'guest' AND subject_id = :id AND token_hash != :keep`, {id, keep: keepSessionHash ?? ""});
    await audit({type: "guest", id, name: row.full_name}, "guest.password_changed", row.code);
  });
}

export async function checkInGuest(code: string, actor: Actor): Promise<{guest: Guest; alreadyCheckedIn: boolean}> {
  return transaction(async () => {
    const guest = await getGuestByCode(code);
    if (!guest) {
      throw new AppError("guestNotFound");
    }
    if (!guest.isActive) {
      throw new AppError("guestInactive");
    }
    // A check-in is verified attendance for this year's event (recorded once per year).
    await recordAttendance(guest.id, await currentEventYear(), "checkin", actor);
    if (guest.checkedInAt) {
      return {guest, alreadyCheckedIn: true};
    }
    await run(`UPDATE guests SET checked_in_at = :now, checked_in_by = :by, updated_at = :now WHERE id = :id`, {id: guest.id, now: nowIso(), by: actor.name});
    await audit(actor, "guest.checked_in", `${guest.fullName} (${guest.code})`);
    return {guest: (await getGuestById(guest.id))!, alreadyCheckedIn: false};
  });
}

/** Everyone registered on the same online application (a family), account holder first. */
export async function listFamily(registrationId: string): Promise<Guest[]> {
  return (
    await many<GuestRow>(`SELECT ${COLUMNS} FROM guests WHERE registration_id = :registrationId ORDER BY is_account_holder DESC, CAST(SUBSTR(code, 3) AS INTEGER)`, {registrationId})
  ).map(toGuest);
}

/** Next free Guest ID (G-1001, G-1002, …). Call inside the transaction that inserts it. */
export async function allocateGuestCode() {
  return nextGuestCode();
}
