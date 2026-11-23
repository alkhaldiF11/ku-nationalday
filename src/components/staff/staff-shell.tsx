"use client";

import Link from "next/link";
import {usePathname} from "next/navigation";
import {
  Award,
  CalendarDays,
  ClipboardList,
  Gamepad2,
  Gift,
  ImageUp,
  Images,
  LayoutDashboard,
  LogOut,
  Medal,
  Megaphone,
  Menu,
  Settings,
  ShieldCheck,
  Trophy,
  UserCheck,
  UserRoundPlus,
  Users,
  X,
} from "lucide-react";
import {useState} from "react";

import {staffLogout} from "@/app/actions/auth";
import {LocaleSwitch} from "@/components/layout/locale-switch";
import {KuMark} from "@/components/ui/ku-logo";
import type {StaffRole} from "@/lib/data/staff";
import {useI18n} from "@/lib/i18n/client";
import type {MessageKey} from "@/lib/i18n/core";
import {cn} from "@/lib/utils/cn";

type Item = {href: string; label: MessageKey; icon: typeof Users; roles: StaffRole[]};
type Section = {label: MessageKey; items: Item[]};

const SECTIONS: Section[] = [
  {label: "staff.sections.overview", items: [{href: "/staff", label: "staff.nav.dashboard", icon: LayoutDashboard, roles: ["admin"]}]},
  {
    label: "staff.sections.desks",
    items: [
      {href: "/staff/reception", label: "staff.nav.reception", icon: UserRoundPlus, roles: ["admin", "reception", "itdesk"]},
    ],
  },
  {
    label: "staff.sections.prizes",
    items: [
      {href: "/staff/prizes/results", label: "staff.nav.results", icon: Gamepad2, roles: ["admin", "itdesk"]},
      {href: "/staff/prizes/teddy", label: "staff.nav.teddy", icon: Gift, roles: ["admin", "itdesk"]},
      {href: "/staff/prizes/draw", label: "staff.nav.draw", icon: Trophy, roles: ["admin"]},
      {href: "/staff/winners", label: "staff.nav.winners", icon: Award, roles: ["admin"]},
      {href: "/staff/ranks", label: "staff.nav.ranks", icon: Medal, roles: ["admin"]},
    ],
  },
  {
    label: "staff.sections.manage",
    items: [
      {href: "/staff/registrations", label: "staff.nav.registrations", icon: UserCheck, roles: ["admin"]},
      {href: "/staff/guests", label: "staff.nav.guests", icon: Users, roles: ["admin"]},
      {href: "/staff/programme", label: "staff.nav.programme", icon: CalendarDays, roles: ["admin"]},
      {href: "/staff/announcements", label: "staff.nav.announcements", icon: Megaphone, roles: ["admin"]},
      {href: "/staff/gallery", label: "staff.nav.gallery", icon: Images, roles: ["admin"]},
      {href: "/staff/photos", label: "staff.nav.photos", icon: ImageUp, roles: ["admin"]},
    ],
  },
  {
    label: "staff.sections.system",
    items: [
      {href: "/staff/team", label: "staff.nav.team", icon: ShieldCheck, roles: ["admin"]},
      {href: "/staff/activity", label: "staff.nav.activity", icon: ClipboardList, roles: ["admin"]},
      {href: "/staff/settings", label: "staff.nav.settings", icon: Settings, roles: ["admin"]},
    ],
  },
];

export function StaffShell({user, badges = {}, children}: {user: {fullName: string; role: StaffRole}; badges?: Record<string, number>; children: React.ReactNode}) {
  const {t} = useI18n();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  const sections = SECTIONS.map((section) => ({...section, items: section.items.filter((item) => item.roles.includes(user.role))})).filter((section) => section.items.length);
  const isActive = (href: string) => (href === "/staff" ? pathname === "/staff" : pathname.startsWith(href));

  const nav = (
    <nav className="flex-1 space-y-6 overflow-y-auto px-3 py-4" aria-label={t("staff.portal")}>
      {sections.map((section) => (
        <div key={section.label}>
          <p className="px-3 pb-2 text-[11px] font-bold tracking-[0.14em] text-white/40 uppercase">{t(section.label)}</p>
          <ul className="space-y-0.5">
            {section.items.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  aria-current={isActive(item.href) ? "page" : undefined}
                  onClick={() => setOpen(false)}
                  className={cn(
                    "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold text-white/70 transition hover:bg-white/5 hover:text-white",
                    isActive(item.href) && "bg-white/10 text-white",
                  )}
                >
                  <item.icon className={cn("size-[18px]", isActive(item.href) && "text-crimson")} aria-hidden />
                  {t(item.label)}
                  {badges[item.href] ? (
                    <span className="tabular ms-auto rounded-full bg-crimson px-2 py-0.5 text-xs font-bold text-white">{badges[item.href]}</span>
                  ) : null}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </nav>
  );

  const footer = (
    <div className="border-t border-white/10 p-4">
      <p className="text-[11px] font-semibold text-white/40">{t("staff.signedInAs")}</p>
      <p className="truncate font-semibold text-white">{user.fullName}</p>
      <p className="text-xs text-white/50">{t(`staff.roles.${user.role}`)}</p>
      <div className="mt-3 flex items-center justify-between gap-2">
        <LocaleSwitch tone="dark" className="-ms-3" />
        <form action={staffLogout}>
          <button type="submit" className="inline-flex h-9 items-center gap-1.5 rounded-xl px-3 text-sm font-semibold text-white/70 hover:bg-white/10 hover:text-white">
            <LogOut className="size-4 rtl:-scale-x-100" aria-hidden />
            {t("common.signOut")}
          </button>
        </form>
      </div>
    </div>
  );

  const brand = (
    <Link href="/staff" className="flex items-center gap-3 px-5 py-5">
      <KuMark tone="white" size={40} />
      <span className="leading-tight">
        <span className="block text-sm font-bold text-white">{t("brand.university")}</span>
        <span className="block text-xs text-white/50">{t("staff.portal")}</span>
      </span>
    </Link>
  );

  return (
    <div className="min-h-dvh lg:grid lg:grid-cols-[17rem_1fr]">
      <aside className="no-print sticky top-0 hidden h-dvh flex-col bg-night lg:flex">
        {brand}
        {nav}
        {footer}
      </aside>

      <header className="no-print sticky top-0 z-40 flex h-14 items-center justify-between bg-night px-3 lg:hidden">
        <Link href="/staff" className="flex items-center gap-2.5">
          <KuMark tone="white" size={32} />
          <span className="text-sm font-bold text-white">{t("staff.portal")}</span>
        </Link>
        <button type="button" onClick={() => setOpen(true)} className="grid size-10 place-items-center rounded-xl text-white hover:bg-white/10" aria-label={t("common.menu")} aria-expanded={open}>
          <Menu className="size-5" />
        </button>
      </header>

      {open ? (
        <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true">
          <button type="button" className="absolute inset-0 bg-night/60" onClick={() => setOpen(false)} aria-label={t("common.close")} />
          <div className="absolute inset-y-0 start-0 flex w-72 max-w-[85vw] animate-rise flex-col bg-night">
            <div className="flex items-center justify-between pe-3">
              {brand}
              <button type="button" onClick={() => setOpen(false)} className="grid size-10 place-items-center rounded-xl text-white hover:bg-white/10" aria-label={t("common.close")}>
                <X className="size-5" />
              </button>
            </div>
            {nav}
            {footer}
          </div>
        </div>
      ) : null}

      <main className="min-w-0 px-4 py-6 sm:px-6 lg:px-10 lg:py-10">{children}</main>
    </div>
  );
}
