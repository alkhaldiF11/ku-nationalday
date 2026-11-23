"use server";

import {headers} from "next/headers";
import {redirect} from "next/navigation";

import {staffHome} from "@/lib/auth/guards";
import {assertNotLocked, clearFailures, LIMITS, recordFailure} from "@/lib/auth/rate-limit";
import {endSession, startSession} from "@/lib/auth/session";
import {authenticateGuest} from "@/lib/data/guests";
import {applicationStatusFor} from "@/lib/data/registrations";
import {authenticateStaff} from "@/lib/data/staff";
import {parse, runAction} from "@/lib/actions";
import {AppError} from "@/lib/errors";
import {guestLoginSchema, staffLoginSchema} from "@/lib/validation";

async function clientIp() {
  const list = await headers();
  return list.get("x-forwarded-for")?.split(",")[0]?.trim() || list.get("x-real-ip") || "local";
}

/** Rate-limits by both account identifier and IP so neither can be brute-forced. */
async function withLoginLimit<T>(scope: string, identifier: string, attempt: () => Promise<T>): Promise<T> {
  const accountKey = `${scope}:id:${identifier.trim().toLowerCase()}`;
  const ipKey = `${scope}:ip:${await clientIp()}`;
  await assertNotLocked(accountKey, LIMITS.account);
  await assertNotLocked(ipKey, LIMITS.ip);
  try {
    const result = await attempt();
    await clearFailures(accountKey);
    return result;
  } catch (error) {
    if (error instanceof AppError && error.key === "invalidCredentials") {
      await recordFailure(accountKey);
      await recordFailure(ipKey);
    }
    throw error;
  }
}

/** Only allow same-site relative redirects. */
const safeNext = (value: FormDataEntryValue | null, fallback: string) =>
  typeof value === "string" && value.startsWith("/") && !value.startsWith("//") ? value : fallback;

export async function guestLogin(_prev: unknown, formData: FormData) {
  const result = await runAction(async () => {
    const input = parse(guestLoginSchema, formData);
    const guest = await withLoginLimit("guest", input.identifier, async () => {
      try {
        return await authenticateGuest(input.identifier, input.password);
      } catch (error) {
        // Right password for an application that isn't approved: say so rather than "wrong password".
        if (error instanceof AppError && error.key === "invalidCredentials") {
          const status = await applicationStatusFor(input.identifier, input.password);
          if (status) throw new AppError(status === "pending" ? "registrationPending" : "registrationRejected");
        }
        throw error;
      }
    });
    await startSession("guest", guest.id);
  });
  if (result.ok) {
    redirect(safeNext(formData.get("next"), "/guest"));
  }
  return result;
}

export async function guestLogout() {
  await endSession("guest");
  redirect("/");
}

export async function staffLogin(_prev: unknown, formData: FormData) {
  let home = "/staff";
  const result = await runAction(async () => {
    const input = parse(staffLoginSchema, formData);
    const staff = await withLoginLimit("staff", input.username, () => authenticateStaff(input.username, input.password));
    await startSession("staff", staff.id);
    home = staffHome(staff.role);
  });
  if (result.ok) {
    redirect(safeNext(formData.get("next"), home));
  }
  return result;
}

export async function staffLogout() {
  await endSession("staff");
  redirect("/staff/login");
}
