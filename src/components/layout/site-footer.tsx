import Link from "next/link";
import {Mail, MapPin, Phone} from "lucide-react";

import {FlagMark} from "@/components/ui/flag-mark";
import {KuLogo} from "@/components/ui/ku-logo";
import type {EventSettings} from "@/lib/data/content";
import {getI18n} from "@/lib/i18n/server";

export async function SiteFooter({settings}: {settings: EventSettings}) {
  const {t} = await getI18n();
  const links = [
    {href: "/programme", label: t("nav.programme")},
    {href: "/gallery", label: t("nav.gallery")},
    {href: "/login", label: t("nav.signIn")},
    {href: "/staff/login", label: t("nav.staffPortal")},
  ];
  return (
    <footer className="no-print mt-16 bg-night text-white/75 sm:mt-24">
      <div className="serration h-[14px] rotate-180 [--serration-fill:var(--color-paper)] sm:h-[18px]" aria-hidden />
      <div className="mx-auto grid max-w-7xl gap-8 px-5 py-10 sm:px-6 sm:py-12 md:grid-cols-[1.4fr_1fr_1fr]">
        <div>
          <KuLogo tone="white" size={52} alt={t("brand.university")} />
          <p className="mt-4 flex items-center gap-2 font-semibold text-white">
            <FlagMark width={24} className="rounded-[3px]" />
            {t("brand.event")}
          </p>
          <p className="mt-2 max-w-sm text-sm leading-relaxed">{t("home.footer")}</p>
        </div>
        <ul className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm md:grid-cols-1">
          {links.map((link) => (
            <li key={link.href}>
              <Link href={link.href} className="flex min-h-11 items-center hover:text-white md:min-h-0 md:py-1">
                {link.label}
              </Link>
            </li>
          ))}
        </ul>
        <ul className="space-y-2.5 text-sm">
          <li className="flex items-start gap-2.5">
            <MapPin className="mt-0.5 size-4 shrink-0 text-white/50" aria-hidden />
            {settings.eventVenue}
          </li>
          <li className="flex items-center gap-2.5">
            <Mail className="size-4 shrink-0 text-white/50" aria-hidden />
            <a href={`mailto:${settings.contactEmail}`} dir="ltr" className="hover:text-white">{settings.contactEmail}</a>
          </li>
          {settings.contactPhone ? (
            <li className="flex items-center gap-2.5">
              <Phone className="size-4 shrink-0 text-white/50" aria-hidden />
              <a href={`tel:${settings.contactPhone.replace(/\s/g, "")}`} dir="ltr" className="hover:text-white">{settings.contactPhone}</a>
            </li>
          ) : null}
        </ul>
      </div>
      <div className="border-t border-white/10 px-5 py-5 text-center text-xs text-white/50">
        © {new Date().getFullYear()} {t("brand.university")} · {settings.eventName}
      </div>
    </footer>
  );
}
