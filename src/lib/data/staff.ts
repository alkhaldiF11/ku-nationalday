import {hashPassword, verifyPassword} from "@/lib/auth/password";
import {audit, type Actor} from "@/lib/data/audit";
import {many, newId, nowIso, one, run, transaction} from "@/lib/db";
import {AppError} from "@/lib/errors";

export const STAFF_ROLES = ["admin", "reception", "itdesk"] as const;
export type StaffRole = (typeof STAFF_ROLES)[number];

export type StaffUser = {
  id: string;
  username: string;
  fullName: string;
  role: StaffRole;
  isActive: boolean;
  createdAt: string;
};

type StaffRow = {id: string; username: string; full_name: string; role: StaffRole; password_hash: string; is_active: number; created_at: string};

const toStaff = (row: StaffRow): StaffUser => ({
  id: row.id,
  username: row.username,
  fullName: row.full_name,
  role: row.role,
  isActive: row.is_active === 1,
  createdAt: row.created_at,
});

export function staffActor(user: StaffUser): Actor {
  return {type: "staff", id: user.id, name: user.fullName};
}

export async function getStaffById(id: string): Promise<StaffUser | null> {
  const row = await one<StaffRow>(`SELECT * FROM staff_users WHERE id = :id`, {id});
  return row ? toStaff(row) : null;
}

const DUMMY_HASH = hashPassword("not-a-real-password");

export async function authenticateStaff(username: string, password: string): Promise<StaffUser> {
  const row = await one<StaffRow>(`SELECT * FROM staff_users WHERE username = :username`, {username: username.trim()});
  const valid = verifyPassword(password, row?.password_hash ?? DUMMY_HASH);
  if (!row || !valid) {
    throw new AppError("invalidCredentials");
  }
  if (row.is_active !== 1) {
    throw new AppError("accountInactive");
  }
  return toStaff(row);
}

export async function listStaff(): Promise<StaffUser[]> {
  return (await many<StaffRow>(`SELECT * FROM staff_users ORDER BY CASE role WHEN 'admin' THEN 0 ELSE 1 END, full_name`)).map(toStaff);
}

export async function createStaff(input: {username: string; fullName: string; role: StaffRole; password: string}, actor: Actor) {
  return transaction(async () => {
    if (await one(`SELECT 1 FROM staff_users WHERE username = :username`, {username: input.username.trim()})) {
      throw new AppError("usernameTaken");
    }
    const id = newId();
    const now = nowIso();
    await run(
      `INSERT INTO staff_users (id, username, full_name, role, password_hash, is_active, created_at, updated_at)
       VALUES (:id, :username, :fullName, :role, :hash, 1, :now, :now)`,
      {id, username: input.username.trim().toLowerCase(), fullName: input.fullName.trim(), role: input.role, hash: hashPassword(input.password), now},
    );
    await audit(actor, "staff.created", `${input.username} (${input.role})`);
    return await getStaffById(id)!;
  });
}

async function activeAdminCount() {
  return (await one<{n: number}>(`SELECT COUNT(*) AS n FROM staff_users WHERE role = 'admin' AND is_active = 1`))?.n ?? 0;
}

export async function updateStaff(id: string, patch: {fullName: string; role: StaffRole; isActive: boolean}, actor: Actor) {
  return transaction(async () => {
    const current = await getStaffById(id);
    if (!current) {
      throw new AppError("notFound");
    }
    const losesAdmin = current.role === "admin" && current.isActive && (patch.role !== "admin" || !patch.isActive);
    if (losesAdmin && actor.id === id) {
      throw new AppError("cannotChangeSelf");
    }
    if (losesAdmin && await activeAdminCount() <= 1) {
      throw new AppError("lastAdmin");
    }
    await run(`UPDATE staff_users SET full_name = :fullName, role = :role, is_active = :active, updated_at = :now WHERE id = :id`, {
      id,
      fullName: patch.fullName.trim(),
      role: patch.role,
      active: patch.isActive ? 1 : 0,
      now: nowIso(),
    });
    if (!patch.isActive || patch.role !== current.role) {
      await run(`DELETE FROM sessions WHERE subject_type = 'staff' AND subject_id = :id`, {id});
    }
    await audit(actor, "staff.updated", `${current.username}: ${patch.role}${patch.isActive ? "" : " (inactive)"}`);
    return await getStaffById(id)!;
  });
}

export async function setStaffPassword(id: string, password: string, actor: Actor) {
  await transaction(async () => {
    const current = await getStaffById(id);
    if (!current) {
      throw new AppError("notFound");
    }
    await run(`UPDATE staff_users SET password_hash = :hash, updated_at = :now WHERE id = :id`, {id, hash: hashPassword(password), now: nowIso()});
    if (actor.id !== id) {
      await run(`DELETE FROM sessions WHERE subject_type = 'staff' AND subject_id = :id`, {id});
    }
    await audit(actor, "staff.password_set", current.username);
  });
}
