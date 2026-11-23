import {beforeEach, describe, expect, it} from "vitest";

import {authenticateGuest, createGuest, listFamily} from "@/lib/data/guests";
import {
  applicationStatusFor,
  approveRegistration,
  getRegistration,
  isUniversityEmail,
  listRegistrations,
  registrationStats,
  rejectRegistration,
  submitRegistration,
} from "@/lib/data/registrations";
import {one, resetDb, run} from "@/lib/db";
import {AppError} from "@/lib/errors";

const admin = {type: "staff" as const, id: "admin-1", name: "Event Administrator"};
const PASSWORD = "Celebrate2026";

async function expectAppError(fn: () => unknown, key: string) {
  try {
    await fn();
  } catch (error) {
    expect(error).toBeInstanceOf(AppError);
    expect((error as AppError).key).toBe(key);
    return;
  }
  throw new Error(`Expected AppError(${key})`);
}

beforeEach(async () => {
  await resetDb();
});

describe("university email", () => {
  it("accepts the university domain and its subdomains only", () => {
    expect(isUniversityEmail("ali@ku.edu.bh", ["ku.edu.bh"])).toBe(true);
    expect(isUniversityEmail("Ali@Student.KU.edu.bh", ["ku.edu.bh"])).toBe(true);
    expect(isUniversityEmail("ali@gmail.com", ["ku.edu.bh"])).toBe(false);
    expect(isUniversityEmail("ali@fakeku.edu.bh", ["ku.edu.bh"])).toBe(false);
  });
});

describe("student sign-up", () => {
  it("needs a university email, refuses duplicates, and stays pending until approved", async () => {
    await expectAppError(() => submitRegistration({type: "student", fullName: "Sara Ahmed", email: "sara@gmail.com", password: PASSWORD}), "notUniversityEmail");

    const {id} = await submitRegistration({type: "student", fullName: "Sara Ahmed", email: "Sara@student.ku.edu.bh", password: PASSWORD});
    expect((await getRegistration(id))!.status).toBe("pending");
    await expectAppError(() => submitRegistration({type: "student", fullName: "Sara Again", email: "sara@student.ku.edu.bh", password: PASSWORD}), "emailTaken");

    // Pending: no account, and sign-in explains why (only with the right password).
    await expectAppError(() => authenticateGuest("sara@student.ku.edu.bh", PASSWORD), "invalidCredentials");
    expect(await applicationStatusFor("sara@student.ku.edu.bh", PASSWORD)).toBe("pending");
    expect(await applicationStatusFor("sara@student.ku.edu.bh", "wrong-password1")).toBeNull();

    const {codes} = await approveRegistration(id, admin);
    expect(codes).toHaveLength(1);
    const guest = await authenticateGuest("sara@student.ku.edu.bh", PASSWORD);
    expect(guest).toMatchObject({code: codes[0], category: "student", source: "online", isAccountHolder: true, phone: null});
    // The number is permanent: signing in again doesn't change it.
    expect((await authenticateGuest(codes[0], PASSWORD)).code).toBe(codes[0]);
    await expectAppError(() => approveRegistration(id, admin), "registrationNotPending");
  });
});

describe("visitor sign-up", () => {
  it("accepts phone numbers from any country and rejects invalid ones", async () => {
    await expectAppError(() => submitRegistration({type: "visitor", fullName: "No Phone", password: PASSWORD}), "invalidPhone");
    await expectAppError(() => submitRegistration({type: "visitor", fullName: "Bad Phone", phone: "12345", password: PASSWORD}), "invalidPhone");
    for (const [phone, e164] of [
      ["+966 50 123 4567", "+966501234567"], // Saudi Arabia
      ["+44 7911 123456", "+447911123456"], // United Kingdom
      ["+20 100 123 4567", "+201001234567"], // Egypt
      ["+91 98765 43210", "+919876543210"], // India
      ["+1 415 555 2671", "+14155552671"], // United States
      ["3312 3456", "+97333123456"], // Bahrain without the code
    ]) {
      const {id} = await submitRegistration({type: "visitor", fullName: `Visitor ${phone}`, phone, password: PASSWORD});
      expect((await getRegistration(id))!.phone).toBe(e164);
    }
    await expectAppError(() => submitRegistration({type: "visitor", fullName: "Same Phone", phone: "+966501234567", password: PASSWORD}), "phoneTaken");
  });

  it("registers a family as one application; on approval every member gets a unique Guest ID", async () => {
    const {id} = await submitRegistration({
      type: "visitor",
      fullName: "Khalid Al Mannai",
      phone: "+97336001122",
      email: "khalid@example.com",
      password: PASSWORD,
      children: ["Noor Al Mannai", "Hamad Al Mannai", "  ", "Dana Al Mannai"],
    });
    const application = (await getRegistration(id))!;
    expect(application).toMatchObject({isFamily: true, memberCount: 3});
    expect(application.members.map((member) => member.fullName)).toEqual(["Noor Al Mannai", "Hamad Al Mannai", "Dana Al Mannai"]);
    expect((await listRegistrations({status: "pending"})).registrations.map((item) => item.id)).toContain(id);

    const before = (await registrationStats()).byCategory.visitor;
    const {codes} = await approveRegistration(id, admin);
    expect(codes).toHaveLength(4);
    expect(new Set(codes).size).toBe(4);

    const parent = await authenticateGuest("+97336001122", PASSWORD);
    const family = await listFamily(parent.registrationId!);
    expect(family.map((member) => member.fullName)).toEqual(["Khalid Al Mannai", "Noor Al Mannai", "Hamad Al Mannai", "Dana Al Mannai"]);
    expect(family.filter((member) => member.isAccountHolder)).toHaveLength(1);
    expect(family.every((member) => member.category === "visitor" && member.registrationId === id)).toBe(true);
    expect((await getRegistration(id))!.members.every((member) => member.guestCode)).toBe(true);

    // Children have their own number but no sign-in.
    await expectAppError(() => authenticateGuest(family[1].code, PASSWORD), "invalidCredentials");
    // Every individual counts as a visitor.
    expect((await registrationStats()).byCategory.visitor).toBe(before + 4);
  });
});

describe("graduate sign-up", () => {
  it("validates the previous student ID, refuses reuse, and can be rejected and re-submitted", async () => {
    await expectAppError(() => submitRegistration({type: "graduate", fullName: "Old ID", phone: "+97333990011", studentId: "x", password: PASSWORD}), "invalidStudentId");
    const {id} = await submitRegistration({type: "graduate", fullName: "Mona Ali", phone: "+97333990011", studentId: "ku-2019-123", password: PASSWORD});
    expect((await getRegistration(id))!.studentId).toBe("KU-2019-123");
    await expectAppError(() => submitRegistration({type: "graduate", fullName: "Other", phone: "+97333990022", studentId: "KU-2019-123", password: PASSWORD}), "studentIdTaken");

    await rejectRegistration(id, "Student ID not found", admin);
    expect(await getRegistration(id)).toMatchObject({status: "rejected", rejectionReason: "Student ID not found"});
    expect(await applicationStatusFor("+97333990011", PASSWORD)).toBe("rejected");
    await expectAppError(() => authenticateGuest("+97333990011", PASSWORD), "invalidCredentials");
    await expectAppError(() => approveRegistration(id, admin), "registrationNotPending");

    // A rejected application doesn't block a corrected one.
    const again = await submitRegistration({type: "graduate", fullName: "Mona Ali", phone: "+97333990011", studentId: "KU-2019-123", password: PASSWORD});
    expect((await getRegistration(again.id))!.status).toBe("pending");
  });
});

describe("staff sign-up", () => {
  it("needs a university email and a job title", async () => {
    await expectAppError(() => submitRegistration({type: "staff", fullName: "Dr. Ahmed", email: "ahmed@ku.edu.bh", password: PASSWORD}), "invalidInput");
    const {id} = await submitRegistration({type: "staff", fullName: "Dr. Ahmed", email: "ahmed@ku.edu.bh", jobTitle: "Lecturer", password: PASSWORD});
    expect((await getRegistration(id))!.jobTitle).toBe("Lecturer");
    await approveRegistration(id, admin);
    expect((await registrationStats()).byCategory.staff).toBe(1);
  });
});

describe("statistics and safeguards", () => {
  it("count approved individuals only, including desk registrations by category", async () => {
    const start = await registrationStats();
    await submitRegistration({type: "student", fullName: "Pending Student", email: "p@ku.edu.bh", password: PASSWORD});
    const rejected = await submitRegistration({type: "student", fullName: "Rejected Student", email: "r@ku.edu.bh", password: PASSWORD});
    await rejectRegistration(rejected.id, null, admin);
    await createGuest({fullName: "Desk Graduate", phone: "+97333881122", source: "reception", category: "graduate"}, admin);

    const after = await registrationStats();
    expect(after.byCategory.student).toBe(start.byCategory.student);
    expect(after.byCategory.graduate).toBe(start.byCategory.graduate + 1);
    expect(after.total).toBe(start.total + 1);
  });

  it("refuses an approval whose contact details were taken at a desk in the meantime", async () => {
    const {id} = await submitRegistration({type: "visitor", fullName: "Late Applicant", phone: "+97333771122", password: PASSWORD});
    await createGuest({fullName: "Walk-in", phone: "+97333771122", source: "reception"}, admin);
    await expectAppError(() => approveRegistration(id, admin), "phoneTaken");
    expect((await getRegistration(id))!.status).toBe("pending"); // rolled back
  });

  it("enforces one open application per email at the database level too", async () => {
    await submitRegistration({type: "student", fullName: "First", email: "dup@ku.edu.bh", password: PASSWORD});
    await expect(
      run(`INSERT INTO registrations (id, type, status, full_name, email, password_hash, created_at) VALUES ('00000000-0000-4000-8000-000000000001', 'student', 'pending', 'Sneaky', 'DUP@ku.edu.bh', 'x', '2026-01-01')`),
    ).rejects.toThrow(/UNIQUE/);
    expect((await one<{n: number}>(`SELECT COUNT(*) AS n FROM registrations`))!.n).toBe(1);
  });
});
