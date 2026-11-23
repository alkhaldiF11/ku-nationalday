import type {Metadata} from "next";

import {StaffShell} from "@/components/staff/staff-shell";
import {requireStaffPage} from "@/lib/auth/guards";
import {countSubmissionsByStatus} from "@/lib/data/photos";
import {countRegistrationsByStatus} from "@/lib/data/registrations";
import {getI18n} from "@/lib/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  const {t} = await getI18n();
  return {title: t("staff.portal"), robots: {index: false}};
}

export default async function StaffPortalLayout({children}: {children: React.ReactNode}) {
  const staff = await requireStaffPage();
  // Admins see how many applications and guest photos are waiting for review.
  const badges: Record<string, number> =
    staff.role === "admin" ? {"/staff/registrations": (await countRegistrationsByStatus()).pending, "/staff/photos": (await countSubmissionsByStatus()).pending} : {};
  return (
    <StaffShell user={{fullName: staff.fullName, role: staff.role}} badges={badges}>
      {children}
    </StaffShell>
  );
}
