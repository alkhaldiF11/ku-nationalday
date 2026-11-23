import Link from "next/link";
import {Pencil, Search, UserRound} from "lucide-react";

import {CollectionBadge, EligibilityBadge, WinRate} from "@/components/prizes/prize-badges";
import {ResultRecorder} from "@/components/prizes/result-recorder";
import {buttonClass} from "@/components/ui/button";
import {Badge, Card, CardHeader, EmptyState, PageHeader} from "@/components/ui/card";
import {DESK_ACCESS, requireStaffPage} from "@/lib/auth/guards";
import {getGuestByCode, listGuests} from "@/lib/data/guests";
import {getGameResult, listGameResults, type ResultFilter} from "@/lib/data/prizes";
import {formatDateTime, formatNumber} from "@/lib/i18n/core";
import {getI18n} from "@/lib/i18n/server";
import {cn} from "@/lib/utils/cn";

const FILTERS: ResultFilter[] = ["all", "eligible", "notEligible", "toCollect", "collected"];

/** IT Desk — the only digital point for games: record each guest's totals and check teddy-bear eligibility. */
export default async function GameResultsPage({searchParams}: PageProps<"/staff/prizes/results">) {
  const staff = await requireStaffPage(DESK_ACCESS.itdesk);
  const {t, locale} = await getI18n();
  const params = await searchParams;
  const find = typeof params.find === "string" ? params.find.trim() : "";
  const selectedCode = typeof params.guest === "string" ? params.guest : "";
  const q = typeof params.q === "string" ? params.q : "";
  const filter = FILTERS.find((item) => item === params.filter) ?? "all";

  const selected = selectedCode ? await getGuestByCode(selectedCode) : null;
  const current = selected ? await getGameResult(selected.id) : null;
  // Guest picker: an exact Guest ID jumps straight to the guest; otherwise search by ID or name.
  const exact = find ? await getGuestByCode(find) : null;
  const matches = find && !exact ? (await listGuests({query: find, limit: 8})).guests : [];
  const records = await listGameResults({query: q, filter});
  const qs = (extra: Record<string, string>) => `?${new URLSearchParams({...(q ? {q} : {}), ...(filter !== "all" ? {filter} : {}), ...extra})}`;

  return (
    <div>
      <PageHeader eyebrow={t("staff.sections.prizes")} title={t("prizes.results.title")} description={t("prizes.results.lede")} />

      <div className="grid gap-4 sm:gap-6 2xl:grid-cols-[minmax(26rem,1fr)_1.4fr]">
        <Card id="record" className="scroll-mt-20">
          <CardHeader title={t("prizes.results.findTitle")} />
          <form className="flex gap-2" role="search">
            {selectedCode ? <input type="hidden" name="guest" value={selectedCode} /> : null}
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute start-3.5 top-1/2 size-4 -translate-y-1/2 text-muted" aria-hidden />
              <input
                name="find"
                defaultValue={find}
                placeholder={t("prizes.results.findPlaceholder")}
                aria-label={t("prizes.results.findTitle")}
                autoComplete="off"
                autoFocus={!selected}
                className="h-12 w-full rounded-xl bg-card ps-10 pe-3 ring-1 ring-line-strong focus:ring-2 focus:ring-crimson focus:outline-none"
              />
            </div>
            <button type="submit" className={buttonClass("dark", "md", "h-12")}>
              {t("common.search")}
            </button>
          </form>

          {exact ? (
            <Link href={qs({guest: exact.code})} className="mt-3 flex items-center justify-between gap-3 rounded-xl bg-paper px-4 py-3 ring-1 ring-line hover:ring-ink/30">
              <span className="font-semibold">{exact.fullName}</span>
              <span className="font-mono text-sm text-muted" dir="ltr">
                {exact.code}
              </span>
            </Link>
          ) : null}
          {find && !exact ? (
            matches.length ? (
              <ul className="mt-3 divide-y divide-line rounded-xl ring-1 ring-line">
                {matches.map((guest) => (
                  <li key={guest.id}>
                    <Link href={qs({guest: guest.code})} className="flex items-center justify-between gap-3 px-4 py-3 hover:bg-paper">
                      <span className="font-semibold">{guest.fullName}</span>
                      <span className="font-mono text-sm text-muted" dir="ltr">
                        {guest.code}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-3 text-sm font-semibold text-danger">{t("errors.guestNotFound")}</p>
            )
          ) : null}

          {selected ? (
            <div className="mt-5 border-t border-line pt-5 sm:mt-6 sm:pt-6">
              <div className="mb-5 flex items-center gap-3">
                <span className="grid size-11 place-items-center rounded-full bg-crimson-wash text-crimson">
                  <UserRound className="size-5" aria-hidden />
                </span>
                <div className="min-w-0">
                  <p className="truncate text-lg font-bold">{selected.fullName}</p>
                  <p className="font-mono text-sm text-muted" dir="ltr">
                    {selected.code}
                  </p>
                </div>
                {!selected.isActive ? <Badge tone="danger">{t("common.inactive")}</Badge> : null}
              </div>
              <ResultRecorder
                key={selected.code}
                guest={{code: selected.code, fullName: selected.fullName}}
                current={current ? {gamesPlayed: current.gamesPlayed, gamesWon: current.gamesWon, teddyCollectedAt: current.teddyCollectedAt} : null}
                isAdmin={staff.role === "admin"}
              />
            </div>
          ) : (
            <p className="mt-6 rounded-2xl border border-dashed border-line-strong bg-paper px-4 py-8 text-center text-sm text-muted">{t("prizes.results.selectFirst")}</p>
          )}
        </Card>

        <Card className="p-0 sm:p-0">
          <div className="p-5 pb-0 sm:p-6 sm:pb-0">
            <CardHeader title={t("prizes.results.recordsTitle")} description={t("prizes.results.recordsLede")} className="mb-4" />
            <form className="mb-3 flex gap-2" role="search">
              <input
                name="q"
                type="search"
                defaultValue={q}
                placeholder={t("prizes.results.findPlaceholder")}
                aria-label={t("common.search")}
                className="h-11 min-w-0 flex-1 rounded-xl bg-card px-3 text-base ring-1 ring-line-strong focus:ring-2 focus:ring-crimson focus:outline-none sm:h-10 sm:text-sm"
              />
              {filter !== "all" ? <input type="hidden" name="filter" value={filter} /> : null}
              <button type="submit" className={buttonClass("secondary", "sm", "h-11 shrink-0 sm:h-10")}>
                {t("common.search")}
              </button>
            </form>
            <nav className="-mx-4 mb-4 flex gap-1.5 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-wrap sm:px-0" aria-label={t("common.filter")}>
              {FILTERS.map((item) => (
                <Link
                  key={item}
                  href={`?${new URLSearchParams({...(q ? {q} : {}), ...(item !== "all" ? {filter: item} : {})})}`}
                  aria-current={item === filter ? "page" : undefined}
                  className={cn("inline-flex h-9 shrink-0 items-center rounded-full px-3.5 text-[13px] font-semibold ring-1 sm:h-auto sm:py-1 sm:text-xs", item === filter ? "bg-ink text-white ring-ink" : "bg-card text-ink-soft ring-line hover:ring-ink/30")}
                >
                  {t(`prizes.filters.${item}`)}
                </Link>
              ))}
            </nav>
          </div>
          {records.length ? (
            <>
            {/* Phones: one tappable card per guest (opens the recorder above). */}
            <ul className="divide-y divide-line border-t border-line md:hidden">
              {records.map((record) => (
                <li key={record.guestId}>
                  <Link
                    href={`${qs({guest: record.guestCode})}#record`}
                    className={cn("flex items-center gap-3 px-4 py-3.5 active:bg-paper", record.guestCode === selected?.code && "bg-crimson-wash/50")}
                    aria-label={`${t("common.edit")}: ${record.guestName}`}
                  >
                    <div className="min-w-0 flex-1">
                      <p className="flex items-baseline gap-2">
                        <span className="truncate font-semibold" dir="auto">{record.guestName}</span>
                        <span className="shrink-0 font-mono text-xs text-muted" dir="ltr">{record.guestCode}</span>
                      </p>
                      <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                        <EligibilityBadge played={record.gamesPlayed} eligible={record.eligible} />
                        {record.eligible ? <CollectionBadge eligible={record.eligible} collectedAt={record.teddyCollectedAt} /> : null}
                      </div>
                    </div>
                    <div className="w-24 shrink-0 text-end">
                      <p className="tabular text-sm font-bold">
                        {formatNumber(locale, record.gamesWon)}/{formatNumber(locale, record.gamesPlayed)}
                      </p>
                      <WinRate rate={record.winRate} />
                    </div>
                    <Pencil className="size-4 shrink-0 text-muted" aria-hidden />
                  </Link>
                </li>
              ))}
            </ul>
            <div className="hidden overflow-x-auto md:block">
              <table className="w-full min-w-[40rem] text-sm">
                <thead>
                  <tr className="border-y border-line text-xs font-semibold text-muted">
                    <th className="px-5 py-2.5 text-start sm:px-6">{t("guest.guestId")}</th>
                    <th className="px-3 py-2.5 text-start">{t("staff.guests.name")}</th>
                    <th className="px-3 py-2.5 text-end">{t("prizes.wonOfPlayed")}</th>
                    <th className="px-3 py-2.5 text-start">{t("prizes.winRate")}</th>
                    <th className="px-3 py-2.5 text-start">{t("prizes.teddyLabel")}</th>
                    <th className="px-5 py-2.5 sm:px-6">
                      <span className="sr-only">{t("common.actions")}</span>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {records.map((record) => (
                    <tr key={record.guestId} className={cn(record.guestCode === selected?.code && "bg-crimson-wash/50")}>
                      <td className="px-5 py-3 font-mono text-xs sm:px-6" dir="ltr">
                        {record.guestCode}
                      </td>
                      <td className="px-3 py-3">
                        <span className="font-semibold">{record.guestName}</span>
                        <span className="block text-xs text-muted">
                          {record.recordedBy} · {formatDateTime(locale, record.updatedAt)}
                        </span>
                      </td>
                      <td className="tabular px-3 py-3 text-end font-semibold">
                        {formatNumber(locale, record.gamesWon)}/{formatNumber(locale, record.gamesPlayed)}
                      </td>
                      <td className="px-3 py-3">
                        <WinRate rate={record.winRate} />
                      </td>
                      <td className="space-y-1 px-3 py-3">
                        <EligibilityBadge played={record.gamesPlayed} eligible={record.eligible} />
                        {record.eligible ? (
                          <div>
                            <CollectionBadge eligible={record.eligible} collectedAt={record.teddyCollectedAt} />
                          </div>
                        ) : null}
                      </td>
                      <td className="px-5 py-3 text-end sm:px-6">
                        <Link href={qs({guest: record.guestCode})} className={buttonClass("ghost", "sm")} aria-label={`${t("common.edit")}: ${record.guestName}`}>
                          <Pencil className="size-4" aria-hidden />
                          <span className="max-sm:sr-only">{t("common.edit")}</span>
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            </>
          ) : (
            <div className="p-5 sm:p-6">
              <EmptyState title={t("prizes.results.noRecords")} />
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
