"use server";

import {refresh} from "next/cache";
import {headers} from "next/headers";
import {z} from "zod";

import {parse, runAction, type ActionResult} from "@/lib/actions";
import {requireStaff} from "@/lib/auth/guards";
import {assertNotLocked, recordFailure} from "@/lib/auth/rate-limit";
import {staffActor} from "@/lib/data/staff";
import {approveRegistration, rejectRegistration, submitRegistration} from "@/lib/data/registrations";
import type {ErrorKey} from "@/lib/errors";
import {registrationSchema, rejectRegistrationSchema} from "@/lib/validation";

/** Public form: generous per-IP limit, since a whole venue can share one address. */
const REGISTRATIONS_PER_IP = 40;

/** Data-layer errors that belong next to a specific field. */
const FIELD_OF: Partial<Record<ErrorKey, string>> = {
  emailTaken: "email",
  notUniversityEmail: "email",
  phoneTaken: "phone",
  invalidPhone: "phone",
  studentIdTaken: "studentId",
  invalidStudentId: "studentId",
  tooManyChildren: "children",
};

async function clientIp() {
  const list = await headers();
  return list.get("x-forwarded-for")?.split(",")[0]?.trim() || list.get("x-real-ip") || "local";
}

/** Anyone can apply; the application stays pending until an administrator decides. */
export async function registerApplicant(_prev: unknown, formData: FormData): Promise<ActionResult<{family: number}>> {
  const result = await runAction(async () => {
    // Bots fill every field, including this one hidden from people.
    if (String(formData.get("website") ?? "")) return {family: 0};
    const ipKey = `register:ip:${await clientIp()}`;
    await assertNotLocked(ipKey, REGISTRATIONS_PER_IP);

    const input = parse(registrationSchema, {
      ...Object.fromEntries(formData.entries()),
      children: formData.get("family") === "on" ? formData.getAll("child").map(String).filter((name) => name.trim()) : [],
    });
    await submitRegistration({
      type: input.type,
      fullName: input.fullName,
      email: input.email,
      phone: input.phone,
      studentId: input.studentId,
      jobTitle: input.jobTitle,
      password: input.password,
      children: input.type === "visitor" && input.family ? input.children : [],
    });
    await recordFailure(ipKey); // counts submissions per IP (the same window as sign-in limits)
    return {family: input.type === "visitor" && input.family ? input.children.length + 1 : 0};
  });
  if (!result.ok && FIELD_OF[result.error]) {
    // Shown under its field only (the form shows no top-level alert for invalidInput with field errors).
    return {...result, error: "invalidInput", fieldErrors: {...result.fieldErrors, [FIELD_OF[result.error]!]: `errors.${result.error}`}};
  }
  return result;
}

const id = (value: unknown) => z.uuid().parse(value);

/** Administrators only: creates the guest accounts (one Guest ID per person). */
export async function adminApproveRegistration(registrationId: string) {
  return runAction(async () => {
    const admin = await requireStaff(["admin"]);
    const {codes} = await approveRegistration(id(registrationId), staffActor(admin));
    refresh();
    return {codes};
  });
}

export async function adminRejectRegistration(_prev: unknown, formData: FormData) {
  return runAction(async () => {
    const admin = await requireStaff(["admin"]);
    const input = parse(rejectRegistrationSchema, formData);
    await rejectRegistration(input.id, input.reason, staffActor(admin));
    refresh();
  });
}
