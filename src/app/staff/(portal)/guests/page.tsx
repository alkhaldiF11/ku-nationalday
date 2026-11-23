import Link from "next/link";
import {ChevronLeft, ChevronRight, Search} from "lucide-react";

import {AddGuestButton} from "@/components/staff/admin/guest-admin";
import {buttonClass} from "@/components/ui/button";
import {Badge, Card, EmptyState, PageHeader} from "@/components/ui/card";
import {requireStaffPage} from "@/lib/auth/guards";
import {listGuests, type GuestFilter} from "@/lib/data/guests";
import {getGameResultsFor} from "@/lib/data/prizes";
import {formatDateTime, formatNumber} from "@/lib/i18n/core";
import {getI18n} from "@/lib/i18n/server";
import {cn} from "@/lib/utils/cn";

const PAGE_SIZE = 20;
const STATUSES = ["all", "active", "inactive", "checked-in", "not-checked-in"] as const;

export default async function GuestsPage({searchParams}: PageProps<"/staff/guests">) {
  await requireStaffPage(["admin"]);
  const {t, locale} = await getI18n();
  const params = await searchParams;
  const query = typeof params.q === "string" ? params.q : "";
  const status = STATUSES.find((item) => item === params.status) ?? "all";
  const page = Math.max(1, Number(params.page) || 1);
  const {guests, total} = await listGuests({query, status: status as GuestFilter["status"], limit: PAGE_SIZE, offset: (page - 1) * PAGE_SIZE});
  const results = await getGameResultsFor(guests.map((guest) => guest.id)); // one query for the whole page
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const statusLabel = {
    all: t("staff.guests.statusAll"),
    active: t("staff.guests.statusActive"),
    inactive: t("staff.guests.statusInactive"),
    "checked-in": t("staff.guests.statusCheckedIn"),
    "not-checked-in": t("staff.guests.statusNotCheckedIn"),
  };
  const href = (overrides: Record<string, string | number>) => {
    const search = new URLSearchParams({...(query ? {q: query} : {}), ...(status !== "all" ? {status} : {}), ...Object.fromEntries(Object.entries(overrides).map(([k, v]) => [k, String(v)]))});
    return `/staff/guests?${search}`;
  };

  return (
    <div>
      <PageHeader eyebrow={t("staff.sections.manage")} title={t("staff.guests.title")} description={t("staff.guests.lede")} action={<AddGuestButton />} />

      <Card className="p-0 sm:p-0">
        <form className="grid grid-cols-[1fr_auto] gap-2 border-b border-line p-4 sm:flex sm:flex-wrap sm:p-5" role="search">
          <div className="relative col-span-2 min-w-0 sm:min-w-56 sm:flex-1">
            <Search className="pointer-events-none absolute start-3.5 top-1/2 size-4 -translate-y-1/2 text-muted" aria-hidden />
            <input
              name="q"
              type="search"
              defaultValue={query}
              placeholder={t("staff.guests.searchPlaceholder")}
              aria-label={t("common.search")}
              className="h-11 w-full rounded-xl bg-card ps-10 pe-3 text-base ring-1 ring-line-strong focus:ring-2 focus:ring-crimson focus:outline-none sm:text-sm"
            />
          </div>
          <select name="status" defaultValue={status} aria-label={t("common.filter")} className="h-11 min-w-0 rounded-xl bg-card px-3 ring-1 ring-line-strong focus:ring-2 focus:ring-crimson focus:outline-none">
            {STATUSES.map((item) => (
              <option key={item} value={item}>
                {statusLabel[item]}
              </option>
            ))}
          </select>
          <button type="submit" className={buttonClass("dark")}>
            {t("common.search")}
          </button>
        </form>

        {guests.length ? (
          <>
          {/* Phones: one card per guest. */}
          <ul className="divide-y divide-line md:hidden">
            {guests.map((guest) => {
              const result = results.get(guest.id);
              return (
                <li key={guest.id} className={cn(!guest.isActive && "opacity-60")}>
                  <Link href={`/staff/guests/${guest.id}`} className="flex items-center gap-3 px-4 py-3.5 active:bg-paper">
                    <div className="min-w-0 flex-1">
                      <p className="flex items-baseline gap-2">
                        <span className="truncate font-semibold" dir="auto">{guest.fullName}</span>
                        <span className="shrink-0 font-mono text-xs text-muted" dir="ltr">{guest.code}</span>
                      </p>
                      <p className="mt-0.5 truncate text-sm text-ink-soft" dir="ltr">
                        <span className="block text-start rtl:text-end">{guest.phone ?? guest.email ?? "—"}</span>
                      </p>
                      <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                        <Badge>{t(`guestCategories.${guest.category}`)}</Badge>
                        {!guest.isActive ? <Badge tone="danger">{t("common.inactive")}</Badge> : guest.checkedInAt ? <Badge tone="success">{t("guest.checkedIn")}</Badge> : <Badge>{t("staff.guests.notCheckedIn")}</Badge>}
                        {result ? (
                          <span className="tabular text-xs font-semibold text-ink-soft">
                            {formatNumber(locale, result.gamesWon)}/{formatNumber(locale, result.gamesPlayed)} · {formatNumber(locale, result.winRate ?? 0)}%
                          </span>
                        ) : null}
                      </div>
                    </div>
                    <ChevronLeft className="size-4 shrink-0 text-muted ltr:rotate-180" aria-hidden />
                  </Link>
                </li>
              );
            })}
          </ul>
          <div className="hidden overflow-x-auto md:block">
            <table className="w-full min-w-[44rem] text-sm">
              <thead>
                <tr className="border-b border-line text-xs font-semibold text-muted">
                  <th className="px-5 py-3 text-start">{t("staff.guests.name")}</th>
                  <th className="px-3 py-3 text-start">{t("staff.guests.contact")}</th>
                  <th className="px-3 py-3 text-end">{t("prizes.results.short")}</th>
                  <th className="px-3 py-3 text-start">{t("staff.guests.checkIn")}</th>
                  <th className="px-5 py-3 text-start">{t("staff.guests.joined")}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {guests.map((guest) => (
                  <tr key={guest.id} className={cn("transition hover:bg-paper", !guest.isActive && "opacity-60")}>
                    <td className="px-5 py-3">
                      <Link href={`/staff/guests/${guest.id}`} className="group block">
                        <span className="font-semibold text-ink group-hover:text-crimson group-hover:underline">{guest.fullName}</span>
                        <span className="block font-mono text-xs text-muted" dir="ltr">
                          {guest.code}
                        </span>
                        <span className="text-xs text-muted">{t(`guestCategories.${guest.category}`)}</span>
                      </Link>
                    </td>
                    <td className="px-3 py-3 text-ink-soft" dir="ltr">
                      <span className="block text-start rtl:text-end">{guest.phone}</span>
                      {guest.email ? <span className="block text-xs text-muted rtl:text-end">{guest.email}</span> : null}
                    </td>
                    <td className="tabular px-3 py-3 text-end font-semibold">
                      {(() => {
                        const result = results.get(guest.id);
                        return result ? `${formatNumber(locale, result.gamesWon)}/${formatNumber(locale, result.gamesPlayed)} · ${formatNumber(locale, result.winRate ?? 0)}%` : "—";
                      })()}
                    </td>
                    <td className="px-3 py-3">
                      {!guest.isActive ? <Badge tone="danger">{t("common.inactive")}</Badge> : guest.checkedInAt ? <Badge tone="success">{t("guest.checkedIn")}</Badge> : <Badge>{t("staff.guests.notCheckedIn")}</Badge>}
                    </td>
                    <td className="px-5 py-3 text-muted">
                      {formatDateTime(locale, guest.createdAt)}
                      <span className="block text-xs">{t(`staff.guests.sources.${guest.source}`)}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          </>
        ) : (
          <div className="p-5">
            <EmptyState title={t("staff.guests.empty")} />
          </div>
        )}

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line px-4 py-3 text-sm text-muted sm:px-5">
          <span>{t("common.showing", {count: formatNumber(locale, guests.length), total: formatNumber(locale, total)})}</span>
          {pages > 1 ? (
            <div className="flex items-center gap-2">
              <span>{t("common.pageOf", {page: formatNumber(locale, page), pages: formatNumber(locale, pages)})}</span>
              <Link href={href({page: page - 1})} aria-disabled={page <= 1} className={cn(buttonClass("secondary", "sm", "size-11 px-0 sm:size-9"), page <= 1 && "pointer-events-none opacity-40")} aria-label={t("common.previous")}>
                <ChevronLeft className="size-4 rtl:-scale-x-100" />
              </Link>
              <Link href={href({page: page + 1})} aria-disabled={page >= pages} className={cn(buttonClass("secondary", "sm", "size-11 px-0 sm:size-9"), page >= pages && "pointer-events-none opacity-40")} aria-label={t("common.next")}>
                <ChevronRight className="size-4 rtl:-scale-x-100" />
              </Link>
            </div>
          ) : null}
        </div>
      </Card>
    </div>
  );
}
