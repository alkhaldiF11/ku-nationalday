import {redirect} from "next/navigation";

import {getCurrentGuest, getCurrentStaff} from "@/lib/auth/session";
import type {StaffRole, StaffUser} from "@/lib/data/staff";
import {AppError} from "@/lib/errors";

/** Who may open which staff area. Admins can open everything. */
export const DESK_ACCESS = {
  /** Registration & check-in: guest accounts are only ever created by staff. */
  reception: ["admin", "reception", "itdesk"],
  /** IT Desk: record game results and hand out teddy bears. */
  itdesk: ["admin", "itdesk"],
  /** Grand prize draw: administrators only. */
  draw: ["admin"],
} satisfies Record<string, StaffRole[]>;

export function staffHome(role: StaffRole) {
  if (role === "admin") return "/staff";
  if (role === "itdesk") return "/staff/prizes/results";
  return "/staff/reception";
}

/** For pages: redirects instead of throwing. */
export async function requireStaffPage(roles?: StaffRole[]): Promise<StaffUser> {
  const staff = await getCurrentStaff();
  if (!staff) {
    redirect("/staff/login");
  }
  if (roles && !roles.includes(staff.role)) {
    redirect(staffHome(staff.role));
  }
  return staff;
}

export async function requireGuestPage() {
  const guest = await getCurrentGuest();
  if (!guest) {
    redirect("/login");
  }
  return guest;
}

/** For server actions: throws AppError, which runAction turns into an error result. */
export async function requireStaff(roles?: StaffRole[]): Promise<StaffUser> {
  const staff = await getCurrentStaff();
  if (!staff) {
    throw new AppError("unauthorized");
  }
  if (roles && !roles.includes(staff.role)) {
    throw new AppError("forbidden");
  }
  return staff;
}

export async function requireGuest() {
  const guest = await getCurrentGuest();
  if (!guest) {
    throw new AppError("unauthorized");
  }
  return guest;
}
