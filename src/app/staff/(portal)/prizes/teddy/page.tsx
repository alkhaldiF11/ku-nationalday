import Link from "next/link";
import {Gift, PackageCheck, Trophy} from "lucide-react";

import {CollectionBadge, WinRate} from "@/components/prizes/prize-badges";
import {CollectTeddyButton, UndoTeddyButton} from "@/components/prizes/teddy-actions";
import {buttonClass} from "@/components/ui/button";
import {Card, EmptyState, PageHeader, Stat} from "@/components/ui/card";
import {DESK_ACCESS, requireStaffPage} from "@/lib/auth/guards";
import {listGameResults, prizeStats, TEDDY_THRESHOLD_PERCENT} from "@/lib/data/prizes";
import {formatDateTime, formatNumber} from "@/lib/i18n/core";
import {getI18n} from "@/lib/i18n/server";
import {cn} from "@/lib/utils/cn";

const TABS = ["toCollect", "collected", "eligible"] as const;

export default async function TeddyPage({searchParams}: PageProps<"/staff/prizes/teddy">) {
  const staff = await requireStaffPage(DESK_ACCESS.itdesk);
  const {t, locale} = await getI18n();
  const params = await searchParams;
  const tab = TABS.find((item) => item === params.tab) ?? "toCollect";
  const q = typeof params.q === "string" ? params.q : "";
  const stats = await prizeStats();
  const rows = await listGameResults({query: q, filter: tab});
  const n = (value: number) => formatNumber(locale, value);

  return (
    <div>
      <PageHeader eyebrow={t("staff.sections.prizes")} title={t("prizes.teddy.title")} description={t("prizes.teddy.lede", {threshold: TEDDY_THRESHOLD_PERCENT})} />

      <div className="mb-4 grid grid-cols-3 gap-2 sm:mb-6 sm:gap-3">
        <Stat label={t("prizes.teddy.qualified")} value={n(stats.eligible)} icon={<Trophy />} tone="success" />
        <Stat label={t("prizes.teddy.collectedCount")} value={n(stats.collected)} icon={<PackageCheck />} tone="gold" />
        <Stat label={t("prizes.teddy.remaining")} value={n(stats.eligible - stats.collected)} icon={<Gift />} tone="crimson" />
      </div>

      <Card className="p-0 sm:p-0">
        <div className="flex flex-col gap-3 border-b border-line p-4 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between sm:p-5">
          <nav className="-mx-4 flex gap-1.5 overflow-x-auto px-4 sm:mx-0 sm:flex-wrap sm:px-0" aria-label={t("common.filter")}>
            {TABS.map((item) => (
              <Link
                key={item}
                href={`?${new URLSearchParams({tab: item, ...(q ? {q} : {})})}`}
                aria-current={item === tab ? "page" : undefined}
                className={cn("inline-flex h-10 shrink-0 items-center rounded-full px-4 text-sm font-semibold ring-1", item === tab ? "bg-ink text-white ring-ink" : "bg-card text-ink-soft ring-line hover:ring-ink/30")}
              >
                {t(`prizes.teddy.tabs.${item}`)}
              </Link>
            ))}
          </nav>
          <form className="flex w-full gap-2 sm:w-auto" role="search">
            <input type="hidden" name="tab" value={tab} />
            <input
              name="q"
              type="search"
              defaultValue={q}
              placeholder={t("prizes.results.findPlaceholder")}
              aria-label={t("common.search")}
              className="h-11 min-w-0 flex-1 rounded-xl bg-card px-3 text-base ring-1 ring-line-strong focus:ring-2 focus:ring-crimson focus:outline-none sm:h-10 sm:w-56 sm:flex-none sm:text-sm"
            />
            <button type="submit" className={buttonClass("secondary", "sm", "h-11 shrink-0 sm:h-10")}>
              {t("common.search")}
            </button>
          </form>
        </div>

        {rows.length ? (
          <>
          {/* Phones: a card per guest with the hand-over button within thumb reach. */}
          <ul className="divide-y divide-line md:hidden">
            {rows.map((row) => (
              <li key={row.guestId} className="flex items-center gap-3 px-4 py-3.5">
                <div className="min-w-0 flex-1">
                  <p className="flex items-baseline gap-2">
                    <span className="truncate font-semibold" dir="auto">{row.guestName}</span>
                    <span className="shrink-0 font-mono text-xs text-muted" dir="ltr">{row.guestCode}</span>
                  </p>
                  <p className="tabular mt-0.5 text-sm text-ink-soft">
                    {n(row.gamesWon)}/{n(row.gamesPlayed)} · <WinRate rate={row.winRate} inline />
                  </p>
                  {row.teddyCollectedAt ? (
                    <p className="mt-1 text-xs text-muted">
                      {row.teddyCollectedBy} · {formatDateTime(locale, row.teddyCollectedAt)}
                    </p>
                  ) : null}
                </div>
                <div className="shrink-0">
                  {!row.teddyCollectedAt ? (
                    <CollectTeddyButton guestId={row.guestId} guestName={row.guestName} guestCode={row.guestCode} />
                  ) : staff.role === "admin" ? (
                    <UndoTeddyButton guestId={row.guestId} guestCode={row.guestCode} />
                  ) : (
                    <CollectionBadge eligible={row.eligible} collectedAt={row.teddyCollectedAt} />
                  )}
                </div>
              </li>
            ))}
          </ul>
          <div className="hidden overflow-x-auto md:block">
            <table className="w-full min-w-[42rem] text-sm">
              <thead>
                <tr className="border-b border-line text-xs font-semibold text-muted">
                  <th className="px-5 py-2.5 text-start">{t("guest.guestId")}</th>
                  <th className="px-3 py-2.5 text-start">{t("staff.guests.name")}</th>
                  <th className="px-3 py-2.5 text-end">{t("prizes.wonOfPlayed")}</th>
                  <th className="px-3 py-2.5 text-start">{t("prizes.winRate")}</th>
                  <th className="px-3 py-2.5 text-start">{t("prizes.collectionStatus")}</th>
                  <th className="px-5 py-2.5">
                    <span className="sr-only">{t("common.actions")}</span>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {rows.map((row) => (
                  <tr key={row.guestId}>
                    <td className="px-5 py-3 font-mono text-xs" dir="ltr">
                      {row.guestCode}
                    </td>
                    <td className="px-3 py-3 font-semibold">{row.guestName}</td>
                    <td className="tabular px-3 py-3 text-end font-semibold">
                      {n(row.gamesWon)}/{n(row.gamesPlayed)}
                    </td>
                    <td className="px-3 py-3">
                      <WinRate rate={row.winRate} />
                    </td>
                    <td className="px-3 py-3">
                      <CollectionBadge eligible={row.eligible} collectedAt={row.teddyCollectedAt} />
                      {row.teddyCollectedAt ? (
                        <span className="mt-1 block text-xs text-muted">
                          {row.teddyCollectedBy} · {formatDateTime(locale, row.teddyCollectedAt)}
                        </span>
                      ) : null}
                    </td>
                    <td className="px-5 py-3 text-end">
                      {!row.teddyCollectedAt ? (
                        <CollectTeddyButton guestId={row.guestId} guestName={row.guestName} guestCode={row.guestCode} />
                      ) : staff.role === "admin" ? (
                        <UndoTeddyButton guestId={row.guestId} guestCode={row.guestCode} />
                      ) : null}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          </>
        ) : (
          <div className="p-5">
            <EmptyState title={t(`prizes.teddy.empty.${tab}`)} />
          </div>
        )}
      </Card>
    </div>
  );
}
