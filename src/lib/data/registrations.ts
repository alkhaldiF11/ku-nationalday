import {hashPassword, verifyPassword} from "@/lib/auth/password";
import {audit, type Actor} from "@/lib/data/audit";
import {allocateGuestCode, type GuestCategory, normalizeEmail, normalizeInternationalPhone, normalizePhone} from "@/lib/data/guests";
import {many, newId, nowIso, one, run, transaction, type Params} from "@/lib/db";
import {AppError} from "@/lib/errors";

/*
 * Online registration with administrator approval.
 *
 * An application is only a request: it creates no guest account. When an administrator approves
 * it, every person on it (the applicant, plus each child in a family) becomes a guest with their
 * own permanent Guest ID. Pending and rejected applicants have no account, so they can't sign in.
 * Every rule here is enforced server-side; the database adds unique indexes as a second line.
 */

export const REGISTRATION_TYPES = ["student", "visitor", "graduate", "staff"] as const satisfies readonly GuestCategory[];
export type RegistrationType = (typeof REGISTRATION_TYPES)[number];
export const REGISTRATION_STATUSES = ["pending", "approved", "rejected"] as const;
export type RegistrationStatus = (typeof REGISTRATION_STATUSES)[number];

/** Upper bound on children per family application (keeps one form from flooding the draw). */
export const MAX_CHILDREN = 12;

export type RegistrationInput = {
  type: RegistrationType;
  fullName: string;
  email?: string | null;
  phone?: string | null;
  studentId?: string | null;
  jobTitle?: string | null;
  password: string;
  /** Visitors only: children registered on the same family application. */
  children?: string[];
};

export type RegistrationMember = {id: string; fullName: string; position: number; guestCode: string | null};

export type Registration = {
  id: string;
  type: RegistrationType;
  status: RegistrationStatus;
  fullName: string;
  email: string | null;
  phone: string | null;
  studentId: string | null;
  jobTitle: string | null;
  isFamily: boolean;
  memberCount: number;
  rejectionReason: string | null;
  createdAt: string;
  reviewedByName: string | null;
  reviewedAt: string | null;
  /** The applicant's Guest ID once approved. */
  guestCode: string | null;
  guestId: string | null;
};

type Row = {
  id: string;
  type: RegistrationType;
  status: RegistrationStatus;
  full_name: string;
  email: string | null;
  phone: string | null;
  student_id: string | null;
  job_title: string | null;
  is_family: number;
  rejection_reason: string | null;
  created_at: string;
  reviewed_by_name: string | null;
  reviewed_at: string | null;
  member_count: number;
  guest_code: string | null;
  guest_id: string | null;
};

const SELECT = `
  SELECT r.id, r.type, r.status, r.full_name, r.email, r.phone, r.student_id, r.job_title, r.is_family,
         r.rejection_reason, r.created_at, r.reviewed_by_name, r.reviewed_at,
         (SELECT COUNT(*) FROM registration_members m WHERE m.registration_id = r.id) AS member_count,
         g.code AS guest_code, g.id AS guest_id
  FROM registrations r
  LEFT JOIN guests g ON g.registration_id = r.id AND g.is_account_holder = 1`;

const toRegistration = (row: Row): Registration => ({
  id: row.id,
  type: row.type,
  status: row.status,
  fullName: row.full_name,
  email: row.email,
  phone: row.phone,
  studentId: row.student_id,
  jobTitle: row.job_title,
  isFamily: row.is_family === 1,
  memberCount: row.member_count,
  rejectionReason: row.rejection_reason,
  createdAt: row.created_at,
  reviewedByName: row.reviewed_by_name,
  reviewedAt: row.reviewed_at,
  guestCode: row.guest_code,
  guestId: row.guest_id,
});

/* ───────────── University email ───────────── */

/** Domains accepted as "university email" (Event settings). Subdomains count, e.g. student.ku.edu.bh. */
export async function getUniversityDomains(): Promise<string[]> {
  const row = await one<{value: string}>(`SELECT value FROM settings WHERE key = 'university_email_domains'`);
  return parseDomains(row?.value ?? "ku.edu.bh");
}

export const parseDomains = (value: string) =>
  value
    .split(/[\s,;]+/)
    .map((domain) => domain.trim().toLowerCase().replace(/^@/, ""))
    .filter(Boolean);

export function isUniversityEmail(email: string, domains: string[]) {
  const domain = normalizeEmail(email).split("@")[1] ?? "";
  return domains.some((allowed) => domain === allowed || domain.endsWith(`.${allowed}`));
}

/** Previous student IDs: letters, digits and dashes, 4–20 characters (stored upper-case). */
export const normalizeStudentId = (value: string) => value.trim().toUpperCase();
export const STUDENT_ID_PATTERN = /^[A-Z0-9-]{4,20}$/;

/* ───────────── Applicant side ───────────── */

/**
 * Records an application as pending. Validates per type and refuses duplicates: an email, phone or
 * previous student ID that already belongs to a guest, or to another open/approved application.
 */
export async function submitRegistration(input: RegistrationInput): Promise<{id: string}> {
  const type = input.type;
  const fullName = input.fullName.trim();
  const email = input.email?.trim() ? normalizeEmail(input.email) : null;
  const phone = input.phone?.trim() ? normalizeInternationalPhone(input.phone) : null;
  const studentId = input.studentId?.trim() ? normalizeStudentId(input.studentId) : null;
  const jobTitle = input.jobTitle?.trim() || null;
  const children = type === "visitor" ? (input.children ?? []).map((name) => name.trim()).filter(Boolean) : [];

  // Required fields per type (the forms say the same; this is the authority).
  if (!fullName) throw new AppError("invalidInput");
  if (input.phone?.trim() && !phone) throw new AppError("invalidPhone");
  if ((type === "student" || type === "staff") && !email) throw new AppError("invalidInput");
  if ((type === "student" || type === "staff") && !isUniversityEmail(email!, await getUniversityDomains())) {
    throw new AppError("notUniversityEmail");
  }
  if ((type === "visitor" || type === "graduate") && !phone) throw new AppError("invalidPhone");
  if (type === "graduate" && (!studentId || !STUDENT_ID_PATTERN.test(studentId))) throw new AppError("invalidStudentId");
  if (type === "staff" && !jobTitle) throw new AppError("invalidInput");
  if (children.length > MAX_CHILDREN) throw new AppError("tooManyChildren", {max: MAX_CHILDREN});

  const passwordHash = hashPassword(input.password);
  const id = newId();
  return transaction(async () => {
    await assertNotTaken({email, phone, studentId});
    await run(
      `INSERT INTO registrations (id, type, status, full_name, email, phone, student_id, job_title, is_family, password_hash, created_at)
       VALUES (:id, :type, 'pending', :fullName, :email, :phone, :studentId, :jobTitle, :isFamily, :passwordHash, :now)`,
      {id, type, fullName, email, phone, studentId: type === "graduate" ? studentId : null, jobTitle: type === "staff" ? jobTitle : null, isFamily: children.length ? 1 : 0, passwordHash, now: nowIso()},
    );
    for (const [index, name] of children.entries()) {
      await run(`INSERT INTO registration_members (id, registration_id, full_name, position) VALUES (:id, :registrationId, :name, :position)`, {
        id: newId(),
        registrationId: id,
        name,
        position: index + 1,
      });
    }
    await audit({type: "system", id: null, name: fullName}, "registration.submitted", `${fullName} (${type}${children.length ? `, family of ${children.length + 1}` : ""})`);
    return {id};
  });
}

async function assertNotTaken({email, phone, studentId}: {email: string | null; phone: string | null; studentId: string | null}) {
  if (email && (await one(`SELECT 1 FROM guests WHERE lower(email) = :email UNION ALL SELECT 1 FROM registrations WHERE lower(email) = :email AND status <> 'rejected'`, {email}))) {
    throw new AppError("emailTaken");
  }
  if (phone && (await one(`SELECT 1 FROM guests WHERE phone = :phone UNION ALL SELECT 1 FROM registrations WHERE phone = :phone AND status <> 'rejected'`, {phone}))) {
    throw new AppError("phoneTaken");
  }
  if (studentId && (await one(`SELECT 1 FROM registrations WHERE upper(student_id) = :studentId AND status <> 'rejected'`, {studentId}))) {
    throw new AppError("studentIdTaken");
  }
}

/**
 * For the sign-in page: when the credentials match an application that isn't approved, say so
 * (instead of "wrong password"). Only answers when the password is right, so it reveals nothing.
 */
export async function applicationStatusFor(identifier: string, password: string): Promise<"pending" | "rejected" | null> {
  const value = identifier.trim();
  const email = value.includes("@") ? normalizeEmail(value) : null;
  const phone = email ? null : normalizePhone(value);
  if (!email && !phone) return null;
  const rows = await many<{status: RegistrationStatus; password_hash: string}>(
    `SELECT status, password_hash FROM registrations
     WHERE status IN ('pending','rejected') AND ${email ? "lower(email) = :value" : "phone = :value"}
     ORDER BY created_at DESC LIMIT 3`,
    {value: (email ?? phone)!},
  );
  const match = rows.find((row) => verifyPassword(password, row.password_hash));
  return match ? (match.status as "pending" | "rejected") : null;
}

/* ───────────── Administrator side ───────────── */

export type RegistrationFilter = {status?: RegistrationStatus | "all"; type?: RegistrationType | "all"; query?: string; limit?: number; offset?: number};

export async function listRegistrations({status = "pending", type = "all", query = "", limit = 25, offset = 0}: RegistrationFilter = {}) {
  const clauses: string[] = [];
  const params: Params = {};
  if (status !== "all") {
    clauses.push("r.status = :status");
    params.status = status;
  }
  if (type !== "all") {
    clauses.push("r.type = :type");
    params.type = type;
  }
  if (query.trim()) {
    clauses.push(`(r.full_name LIKE :q OR r.email LIKE :q OR r.phone LIKE :q OR r.student_id LIKE :q OR g.code LIKE :q
      OR EXISTS (SELECT 1 FROM registration_members m WHERE m.registration_id = r.id AND m.full_name LIKE :q))`);
    params.q = `%${query.trim().replace(/[%_]/g, "")}%`;
  }
  const where = clauses.length ? `WHERE ${clauses.join(" AND ")}` : "";
  const order = status === "pending" ? "r.created_at ASC" : "COALESCE(r.reviewed_at, r.created_at) DESC";
  const rows = await many<Row>(`${SELECT} ${where} ORDER BY ${order} LIMIT :limit OFFSET :offset`, {...params, limit, offset});
  const total = (await one<{n: number}>(`SELECT COUNT(*) AS n FROM registrations r LEFT JOIN guests g ON g.registration_id = r.id AND g.is_account_holder = 1 ${where}`, params))?.n ?? 0;
  return {total, registrations: rows.map(toRegistration)};
}

export async function countRegistrationsByStatus(): Promise<Record<RegistrationStatus, number>> {
  const counts = {pending: 0, approved: 0, rejected: 0};
  for (const row of await many<{status: RegistrationStatus; n: number}>(`SELECT status, COUNT(*) AS n FROM registrations GROUP BY status`)) {
    counts[row.status] = row.n;
  }
  return counts;
}

export async function getRegistration(id: string): Promise<(Registration & {members: RegistrationMember[]}) | null> {
  if (!/^[0-9a-f-]{36}$/.test(id)) return null;
  const row = await one<Row>(`${SELECT} WHERE r.id = :id`, {id});
  if (!row) return null;
  const members = await many<{id: string; full_name: string; position: number; code: string | null}>(
    `SELECT m.id, m.full_name, m.position, g.code FROM registration_members m LEFT JOIN guests g ON g.id = m.guest_id
     WHERE m.registration_id = :id ORDER BY m.position`,
    {id},
  );
  return {...toRegistration(row), members: members.map((member) => ({id: member.id, fullName: member.full_name, position: member.position, guestCode: member.code}))};
}

/**
 * Approves a pending application: the applicant and every child become guests, each with their
 * own new Guest ID, all linked to this application. The status change is conditional, so two
 * administrators approving at once can't create the accounts twice.
 */
export async function approveRegistration(id: string, reviewer: Actor): Promise<{codes: string[]}> {
  return transaction(async () => {
    const reg = await one<{id: string; type: RegistrationType; full_name: string; email: string | null; phone: string | null; password_hash: string; status: RegistrationStatus}>(
      `SELECT id, type, full_name, email, phone, password_hash, status FROM registrations WHERE id = :id`,
      {id},
    );
    if (!reg) throw new AppError("notFound");
    const changed = await run(
      `UPDATE registrations SET status = 'approved', rejection_reason = NULL, reviewed_by = :by, reviewed_by_name = :byName, reviewed_at = :now
       WHERE id = :id AND status = 'pending'`,
      {id, by: reviewer.id, byName: reviewer.name, now: nowIso()},
    );
    if (changed.changes !== 1) throw new AppError("registrationNotPending");

    // Someone may have been registered at the desk with the same contact details since applying.
    if (reg.phone && (await one(`SELECT 1 FROM guests WHERE phone = :phone`, {phone: reg.phone}))) throw new AppError("phoneTaken");
    if (reg.email && (await one(`SELECT 1 FROM guests WHERE lower(email) = :email`, {email: reg.email}))) throw new AppError("emailTaken");

    const now = nowIso();
    const codes: string[] = [];
    const insertGuest = async (person: {fullName: string; phone: string | null; email: string | null; passwordHash: string | null; holder: boolean; category: GuestCategory}) => {
      const guestId = newId();
      const code = await allocateGuestCode();
      await run(
        `INSERT INTO guests (id, code, full_name, phone, email, notes, password_hash, is_active, source, category, registration_id, is_account_holder, created_at, updated_at)
         VALUES (:id, :code, :fullName, :phone, :email, NULL, :passwordHash, 1, 'online', :category, :registrationId, :holder, :now, :now)`,
        {id: guestId, code, fullName: person.fullName, phone: person.phone, email: person.email, passwordHash: person.passwordHash, category: person.category, registrationId: id, holder: person.holder ? 1 : 0, now},
      );
      codes.push(code);
      return guestId;
    };

    await insertGuest({fullName: reg.full_name, phone: reg.phone, email: reg.email, passwordHash: reg.password_hash, holder: true, category: reg.type});
    // Children are visitors with their own Guest ID; they can't sign in (no password, no contact details).
    for (const member of await many<{id: string; full_name: string}>(`SELECT id, full_name FROM registration_members WHERE registration_id = :id ORDER BY position`, {id})) {
      const guestId = await insertGuest({fullName: member.full_name, phone: null, email: null, passwordHash: null, holder: false, category: "visitor"});
      await run(`UPDATE registration_members SET guest_id = :guestId WHERE id = :memberId`, {guestId, memberId: member.id});
    }
    await audit(reviewer, "registration.approved", `${reg.full_name} (${reg.type}) → ${codes.join(", ")}`);
    return {codes};
  });
}

export async function rejectRegistration(id: string, reason: string | null, reviewer: Actor) {
  await transaction(async () => {
    const reg = await one<{full_name: string; type: RegistrationType}>(`SELECT full_name, type FROM registrations WHERE id = :id`, {id});
    if (!reg) throw new AppError("notFound");
    const changed = await run(
      `UPDATE registrations SET status = 'rejected', rejection_reason = :reason, reviewed_by = :by, reviewed_by_name = :byName, reviewed_at = :now
       WHERE id = :id AND status = 'pending'`,
      {id, reason: reason?.trim() || null, by: reviewer.id, byName: reviewer.name, now: nowIso()},
    );
    if (changed.changes !== 1) throw new AppError("registrationNotPending");
    await audit(reviewer, "registration.rejected", `${reg.full_name} (${reg.type})${reason?.trim() ? ` — ${reason.trim()}` : ""}`);
  });
}

/* ───────────── Statistics ───────────── */

/**
 * Approved individuals per category, straight from the guest table: every active guest counts
 * once (each child in a family is a visitor). Pending/rejected applications have no guests, so
 * they are never counted. Desk registrations are included under their category.
 */
export async function registrationStats() {
  const byCategory = {student: 0, visitor: 0, graduate: 0, staff: 0};
  for (const row of await many<{category: GuestCategory; n: number}>(`SELECT category, COUNT(*) AS n FROM guests WHERE is_active = 1 GROUP BY category`)) {
    byCategory[row.category] = row.n;
  }
  const total = Object.values(byCategory).reduce((sum, n) => sum + n, 0);
  return {byCategory, total};
}

/** Detail for one category (dashboard filter). */
export async function categoryBreakdown(category: GuestCategory) {
  const guests = (await one<{total: number; checked_in: number; online: number; children: number}>(
    `SELECT COUNT(*) AS total, COUNT(checked_in_at) AS checked_in,
            COALESCE(SUM(source = 'online'), 0) AS online, COALESCE(SUM(is_account_holder = 0), 0) AS children
     FROM guests WHERE is_active = 1 AND category = :category`,
    {category},
  ))!;
  const families = (await one<{n: number}>(`SELECT COUNT(*) AS n FROM registrations WHERE status = 'approved' AND is_family = 1 AND type = :category`, {category}))?.n ?? 0;
  const pending = (await one<{n: number}>(`SELECT COUNT(*) AS n FROM registrations WHERE status = 'pending' AND type = :category`, {category}))?.n ?? 0;
  return {total: guests.total, checkedIn: guests.checked_in, online: guests.online, desk: guests.total - guests.online, children: guests.children, families, pending};
}
