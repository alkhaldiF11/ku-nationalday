import Link from "next/link";
import {ChevronLeft, ChevronRight, Search} from "lucide-react";

import {RankEmblem} from "@/components/ranks/rank-emblem";
import {ThresholdsForm} from "@/components/staff/admin/rank-admin";
import {buttonClass} from "@/components/ui/button";
import {Card, CardHeader, EmptyState, PageHeader} from "@/components/ui/card";
import {requireStaffPage} from "@/lib/auth/guards";
import {listRankedGuests, rankStats} from "@/lib/data/attendance";
import {formatNumber} from "@/lib/i18n/core";
import {getI18n} from "@/lib/i18n/server";
import {RANKS, type Rank} from "@/lib/ranks";
import {cn} from "@/lib/utils/cn";

const PAGE_SIZE = 25;

/** Ranks & attendance: statistics, thresholds, and every guest's rank (filterable). */
export default async function RanksPage({searchParams}: PageProps<"/staff/ranks">) {
  await requireStaffPage(["admin"]);
  const {t, locale} = await getI18n();
  const params = await searchParams;
  const filter = ([...RANKS, "none"] as const).find((item) => item === params.rank) ?? "all";
  const query = typeof params.q === "string" ? params.q : "";
  const page = Math.max(1, Number(params.page) || 1);
  const stats = await rankStats();
  const {guests, total} = await listRankedGuests({rank: filter, query, limit: PAGE_SIZE, offset: (page - 1) * PAGE_SIZE});
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const n = (value: number) => formatNumber(locale, value);
  const href = (patch: Record<string, string | number>) => {
    const next = {...(filter !== "all" ? {rank: filter} : {}), ...(query ? {q: query} : {}), ...patch};
    return `?${new URLSearchParams(Object.entries(next).map(([key, value]) => [key, String(value)]))}`;
  };
  const rankLabel = (rank: Rank | null) => (rank ? t(`ranks.${rank}.title`) : t("staff.ranks.none"));

  return (
    <div>
      <PageHeader eyebrow={t("staff.sections.prizes")} title={t("staff.ranks.title")} description={t("staff.ranks.lede")} />

      {/* Statistics: guests per rank (click to filter) */}
      <div className="grid grid-cols-2 gap-2.5 sm:gap-3 lg:grid-cols-5">
        {RANKS.map((rank) => (
          <Link
            key={rank}
            href={href({rank: filter === rank ? "" : rank, page: 1})}
            aria-current={filter === rank ? "true" : undefined}
            className={cn("flex min-w-0 items-center gap-3 rounded-2xl bg-card p-3 shadow-[var(--shadow-card)] ring-1 ring-line transition hover:ring-ink/30", filter === rank && "ring-2 ring-crimson")}
          >
            <RankEmblem rank={rank} size={52} wreath={false} className="shrink-0" />
            <span className="min-w-0">
              <span className="block text-sm leading-snug font-semibold text-ink-soft">{t(`ranks.${rank}.title`)}</span>
              <span className="tabular block font-display text-2xl font-semibold" data-testid={`rank-count-${rank}`}>
                {n(stats.counts[rank])}
              </span>
            </span>
          </Link>
        ))}
        <Link
          href={href({rank: filter === "none" ? "" : "none", page: 1})}
          className={cn("col-span-2 flex min-w-0 flex-col justify-center rounded-2xl bg-paper-deep/70 p-3 ring-1 ring-line lg:col-span-1", filter === "none" && "ring-2 ring-crimson")}
        >
          <span className="text-sm font-semibold text-ink-soft">{t("staff.ranks.none")}</span>
          <span className="tabular font-display text-2xl font-semibold">{n(stats.counts.none)}</span>
        </Link>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-[1.3fr_1fr]">
        <Card>
          <CardHeader title={t("staff.ranks.thresholdsTitle")} description={t("staff.ranks.thresholdsLede")} />
          <ThresholdsForm thresholds={stats.thresholds} />
        </Card>
        <Card>
          <CardHeader title={t("staff.ranks.byYear")} />
          {stats.byYear.length ? (
            <ul className="space-y-2">
              {stats.byYear.map((row) => (
                <li key={row.year} className="flex items-center justify-between rounded-xl bg-paper px-4 py-2.5 ring-1 ring-line">
                  <span className="tabular font-bold">{row.year}</span>
                  <span className="text-sm text-ink-soft">{t("staff.ranks.guests", {count: n(row.n)})}</span>
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState title={t("staff.attendance.none")} />
          )}
        </Card>
      </div>

      {/* Guests and their ranks */}
      <Card className="mt-4 p-0 sm:p-0">
        <form className="flex gap-2 border-b border-line p-4 sm:p-5" role="search">
          {filter !== "all" ? <input type="hidden" name="rank" value={filter} /> : null}
          <div className="relative min-w-0 flex-1">
            <Search className="pointer-events-none absolute start-3.5 top-1/2 size-4 -translate-y-1/2 text-muted" aria-hidden />
            <input
              name="q"
              type="search"
              defaultValue={query}
              placeholder={t("staff.ranks.searchPlaceholder")}
              aria-label={t("common.search")}
              className="h-11 w-full rounded-xl bg-card ps-10 pe-3 text-base ring-1 ring-line-strong focus:ring-2 focus:ring-crimson focus:outline-none sm:text-sm"
            />
          </div>
          <button type="submit" className={buttonClass("dark", "md", "h-11 shrink-0")}>
            {t("common.search")}
          </button>
        </form>
        <nav className="flex gap-2 overflow-x-auto border-b border-line px-4 py-3 sm:px-5" aria-label={t("common.filter")}>
          {(["all", ...RANKS, "none"] as const).map((item) => (
            <Link
              key={item}
              href={href({rank: item === "all" ? "" : item, page: 1})}
              aria-current={filter === item ? "page" : undefined}
              className={cn("inline-flex h-9 shrink-0 items-center rounded-full px-3.5 text-sm font-semibold ring-1", filter === item ? "bg-ink text-white ring-ink" : "bg-card text-ink-soft ring-line hover:ring-ink/30")}
            >
              {item === "all" ? t("staff.ranks.all") : rankLabel(item === "none" ? null : item)}
            </Link>
          ))}
        </nav>
        {guests.length ? (
          <ul className="divide-y divide-line">
            {guests.map((guest) => (
              <li key={guest.id}>
                <Link href={`/staff/guests/${guest.id}`} className="flex items-center gap-3 px-4 py-3 hover:bg-paper sm:px-5">
                  {guest.rank ? <RankEmblem rank={guest.rank} size={34} wreath={false} className="shrink-0" /> : <span className="size-[34px] shrink-0 rounded-full bg-paper-deep" aria-hidden />}
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-semibold">
                      <bdi>{guest.fullName}</bdi> <span className="font-mono text-xs font-normal text-muted" dir="ltr">{guest.code}</span>
                    </span>
                    <span className="block text-xs text-muted">
                      {rankLabel(guest.rank)} · {t("ranks.events", {count: n(guest.attended)})}
                      {guest.years.length ? ` · ${guest.years.join(", ")}` : ""}
                    </span>
                  </span>
                  <ChevronLeft className="size-4 shrink-0 text-muted ltr:rotate-180" aria-hidden />
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <div className="p-5">
            <EmptyState title={t("staff.ranks.empty")} />
          </div>
        )}
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line px-4 py-3 text-sm text-muted sm:px-5">
          <span>{t("common.showing", {count: n(guests.length), total: n(total)})}</span>
          {pages > 1 ? (
            <div className="flex items-center gap-2">
              <span>{t("common.pageOf", {page: n(page), pages: n(pages)})}</span>
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
