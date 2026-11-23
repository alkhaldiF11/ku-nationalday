import type {Metadata} from "next";
import Link from "next/link";
import {redirect} from "next/navigation";

import {StaffLoginForm} from "@/components/auth/auth-forms";
import {LocaleSwitch} from "@/components/layout/locale-switch";
import {KuLogo} from "@/components/ui/ku-logo";
import {staffHome} from "@/lib/auth/guards";
import {getCurrentStaff} from "@/lib/auth/session";
import {DEMO_STAFF} from "@/lib/db/seed";
import {getI18n} from "@/lib/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  const {t} = await getI18n();
  return {title: t("auth.staffTitle"), robots: {index: false}};
}

export default async function StaffLoginPage({searchParams}: PageProps<"/staff/login">) {
  const staff = await getCurrentStaff();
  if (staff) {
    redirect(staffHome(staff.role));
  }
  const {t} = await getI18n();
  const {next} = await searchParams;
  // Demo credentials are only shown when explicitly enabled (never in a real deployment).
  const demo = process.env.SHOW_DEMO_CREDENTIALS === "true" ? DEMO_STAFF.map(({username, password, role}) => ({username, password, role})) : null;

  return (
    <div className="lattice grid min-h-dvh place-items-center bg-night px-4 py-10">
      <div className="w-full max-w-md animate-rise">
        <div className="mb-6 flex items-center justify-between">
          <Link href="/" aria-label={t("brand.university")}>
            <KuLogo tone="white" size={56} />
          </Link>
          <LocaleSwitch tone="dark" />
        </div>
        <div className="rounded-[2rem] bg-card p-6 shadow-[var(--shadow-lift)] sm:p-8">
          <h1 className="font-display text-3xl font-semibold">{t("auth.staffTitle")}</h1>
          <p className="mt-1 mb-6 text-ink-soft">{t("auth.staffLede")}</p>
          <StaffLoginForm next={typeof next === "string" ? next : undefined} demo={demo} />
        </div>
        <Link href="/login" className="mt-6 block text-center text-sm font-semibold text-white/60 hover:text-white">
          {t("auth.guestLink")}
        </Link>
      </div>
    </div>
  );
}
