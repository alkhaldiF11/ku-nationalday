"use client";

import Link from "next/link";
import {usePathname} from "next/navigation";
import {CalendarDays, ChevronLeft, Gift, Home, ImageUp, Images, LogIn, LogOut, Menu, QrCode, ShieldCheck, UserPlus, UserRound, X} from "lucide-react";
import {useEffect, useState} from "react";

import {guestLogout} from "@/app/actions/auth";
import {LocaleSwitch} from "@/components/layout/locale-switch";
import {buttonClass} from "@/components/ui/button";
import {KuMark} from "@/components/ui/ku-logo";
import {useI18n} from "@/lib/i18n/client";
import type {MessageKey} from "@/lib/i18n/core";
import {cn} from "@/lib/utils/cn";

type NavItem = {href: string; label: MessageKey; icon: typeof Home};

const PUBLIC_NAV: NavItem[] = [
  {href: "/", label: "nav.home", icon: Home},
  {href: "/programme", label: "nav.programme", icon: CalendarDays},
  {href: "/gallery", label: "nav.gallery", icon: Images},
  {href: "/register", label: "nav.register", icon: UserPlus},
  {href: "/#how-it-works", label: "nav.howItWorks", icon: Gift},
  {href: "/#contact", label: "nav.contact", icon: UserRound},
];

/** Also the bottom tab bar on phones, so keep it to five short items. */
export const GUEST_NAV: NavItem[] = [
  {href: "/guest", label: "nav.myPass", icon: QrCode},
  {href: "/guest/rewards", label: "nav.rewards", icon: Gift},
  {href: "/guest/photos", label: "nav.myPhotos", icon: ImageUp},
  {href: "/programme", label: "nav.programme", icon: CalendarDays},
  {href: "/guest/profile", label: "nav.profile", icon: UserRound},
];

export function useIsActive() {
  const pathname = usePathname();
  return (href: string) => (href === "/guest" || href === "/" ? pathname === href : !href.includes("#") && pathname.startsWith(href));
}

export function SiteHeader({guestName}: {guestName: string | null}) {
  const {t} = useI18n();
  const pathname = usePathname();
  const isActive = useIsActive();
  // The drawer remembers the page it was opened on, so navigating closes it without an effect.
  const [openOn, setOpenOn] = useState<string | null>(null);
  const open = openOn === pathname;
  const setOpen = (value: boolean) => setOpenOn(value ? pathname : null);
  const nav = guestName ? [...GUEST_NAV, {href: "/gallery", label: "nav.gallery", icon: Images} satisfies NavItem] : PUBLIC_NAV;
  const desktopNav = nav.filter((item) => item.href !== "/");

  // While open: lock page scroll and close on Escape.
  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => event.key === "Escape" && setOpenOn(null);
    document.addEventListener("keydown", onKey);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = overflow;
    };
  }, [open]);

  return (
    <header className="no-print sticky top-0 z-40 border-b border-line/70 bg-paper/90 pt-[env(safe-area-inset-top)] backdrop-blur-md">
      <div className="mx-auto flex h-14 max-w-7xl items-center gap-2 px-4 sm:h-16 sm:gap-4 sm:px-6">
        <Link href={guestName ? "/guest" : "/"} className="flex min-w-0 items-center gap-2.5">
          <KuMark size={34} className="shrink-0" />
          <span className="min-w-0 leading-tight">
            <span className="block truncate text-[15px] font-bold text-ink">{t("brand.event")}</span>
            <span className="block truncate text-xs text-muted">{t("brand.university")}</span>
          </span>
        </Link>

        <nav className="ms-4 hidden items-center gap-1 lg:flex" aria-label="Main">
          {desktopNav.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              aria-current={isActive(item.href) ? "page" : undefined}
              className={cn(
                "rounded-lg px-3 py-2 text-sm font-semibold text-ink-soft transition hover:text-ink",
                isActive(item.href) && "bg-crimson-wash text-crimson-deep hover:text-crimson-deep",
              )}
            >
              {t(item.label)}
            </Link>
          ))}
        </nav>

        <div className="ms-auto flex shrink-0 items-center gap-1">
          <LocaleSwitch className="hidden lg:inline-flex" />
          {guestName ? (
            <form action={guestLogout} className="hidden lg:block">
              <button type="submit" className={buttonClass("ghost", "sm")}>
                <LogOut className="size-4 rtl:-scale-x-100" aria-hidden />
                {t("common.signOut")}
              </button>
            </form>
          ) : pathname !== "/login" ? (
            <Link href="/login" className={cn(buttonClass("primary", "sm"), "h-9 px-3.5 text-sm")}>
              {t("nav.signIn")}
            </Link>
          ) : null}
          <button
            type="button"
            className="grid size-11 place-items-center rounded-xl text-ink hover:bg-paper-deep lg:hidden"
            onClick={() => setOpen(true)}
            aria-expanded={open}
            aria-controls="site-drawer"
            aria-label={t("common.menu")}
          >
            <Menu className="size-6" />
          </button>
        </div>
      </div>

      {open ? (
        <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true" aria-label={t("common.menu")} id="site-drawer">
          <button type="button" className="absolute inset-0 bg-night/50 backdrop-blur-[2px]" onClick={() => setOpen(false)} aria-label={t("common.close")} tabIndex={-1} />
          <div className="absolute inset-y-0 end-0 flex w-[84%] max-w-80 animate-rise flex-col bg-paper pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)] shadow-2xl">
            <div className="flex h-14 items-center justify-between border-b border-line px-4">
              <span className="flex items-center gap-2.5">
                <KuMark size={30} />
                <span className="text-sm font-bold">{t("brand.event")}</span>
              </span>
              <button type="button" onClick={() => setOpen(false)} className="grid size-11 place-items-center rounded-xl hover:bg-paper-deep" aria-label={t("common.close")} autoFocus>
                <X className="size-5" />
              </button>
            </div>

            {guestName ? <p className="px-5 pt-4 text-sm text-muted">{t("guest.greeting", {name: guestName.split(" ")[0]})}</p> : null}

            <nav className="flex-1 overflow-y-auto px-3 py-3" aria-label="Mobile">
              <ul className="space-y-1">
                {nav.map((item) => (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      onClick={() => setOpen(false)}
                      aria-current={isActive(item.href) ? "page" : undefined}
                      className={cn(
                        "flex h-12 items-center gap-3 rounded-xl px-3 font-semibold text-ink-soft transition hover:bg-paper-deep",
                        isActive(item.href) && "bg-crimson-wash text-crimson-deep",
                      )}
                    >
                      <item.icon className="size-5 shrink-0" aria-hidden />
                      <span className="flex-1">{t(item.label)}</span>
                      <ChevronLeft className="size-4 text-muted ltr:rotate-180" aria-hidden />
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>

            <div className="space-y-3 border-t border-line p-4">
              {guestName ? (
                <form action={guestLogout}>
                  <button type="submit" className={cn(buttonClass("secondary"), "h-12 w-full")}>
                    <LogOut className="size-4 rtl:-scale-x-100" aria-hidden />
                    {t("common.signOut")}
                  </button>
                </form>
              ) : (
                <Link href="/login" onClick={() => setOpen(false)} className={cn(buttonClass("primary"), "h-12 w-full")}>
                  <LogIn className="size-4 rtl:-scale-x-100" aria-hidden />
                  {t("nav.signIn")}
                </Link>
              )}
              <div className="flex items-center justify-between">
                <LocaleSwitch className="-ms-3" />
                <Link href="/staff/login" className="inline-flex h-11 items-center gap-1.5 text-sm font-semibold text-muted hover:text-ink">
                  <ShieldCheck className="size-4" aria-hidden />
                  {t("nav.staffPortal")}
                </Link>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </header>
  );
}

/** App-style bottom navigation for signed-in guests on phones. */
export function GuestTabBar() {
  const {t} = useI18n();
  const isActive = useIsActive();
  return (
    <nav
      className="no-print fixed inset-x-0 bottom-0 z-40 border-t border-line bg-card/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-md md:hidden"
      aria-label={t("nav.myPass")}
    >
      <ul className="mx-auto grid max-w-md grid-cols-5">
        {GUEST_NAV.map((item) => {
          const active = isActive(item.href);
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={cn("flex h-16 flex-col items-center justify-center gap-1 text-[11px] font-semibold text-muted", active && "text-crimson")}
              >
                <span className={cn("grid h-7 w-12 place-items-center rounded-full transition", active && "bg-crimson-wash")}>
                  <item.icon className="size-5" aria-hidden />
                </span>
                <span className="max-w-full truncate px-1">{t(item.label === "nav.profile" ? "nav.profileShort" : item.label)}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
