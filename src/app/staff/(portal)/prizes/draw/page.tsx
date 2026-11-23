import Link from "next/link";
import {Award, Ticket, Users} from "lucide-react";

import {GrandPrizeDraw} from "@/components/prizes/grand-prize-draw";
import {Badge, Card, CardHeader, EmptyState, PageHeader, Stat} from "@/components/ui/card";
import {DESK_ACCESS, requireStaffPage} from "@/lib/auth/guards";
import {dashboardStats} from "@/lib/data/content";
import {listDrawEntries, listDraws, type DrawStatus} from "@/lib/data/prizes";
import {formatDateTime, formatNumber} from "@/lib/i18n/core";
import {getI18n} from "@/lib/i18n/server";
import {cn} from "@/lib/utils/cn";

const STATUS_TONE: Record<DrawStatus, "gold" | "success" | "neutral"> = {drawn: "gold", final: "success", void: "neutral"};

/** Grand prize lucky draw over registered Guest IDs — administrators only. */
export default async function GrandPrizeDrawPage({searchParams}: PageProps<"/staff/prizes/draw">) {
  await requireStaffPage(DESK_ACCESS.draw);
  const {t, locale} = await getI18n();
  const {present} = await searchParams;
  const checkedInOnly = present === "1";
  const entries = await listDrawEntries({checkedInOnly});
  const draws = await listDraws();
  const pending = draws.find((draw) => draw.status === "drawn") ?? null;
  const winners = draws.filter((draw) => draw.status === "final").length;
  const registered = (await dashboardStats()).activeGuests;
  const n = (value: number) => formatNumber(locale, value);

  return (
    <div>
      <PageHeader eyebrow={t("staff.sections.prizes")} title={t("prizes.draw.title")} description={t("prizes.draw.lede")} />

      <div className="mb-6 grid grid-cols-3 gap-3">
        <Stat label={t("prizes.draw.registered")} value={n(registered)} icon={<Users />} />
        <Stat label={t("prizes.draw.eligible")} value={n(entries.length)} icon={<Ticket />} tone="crimson" />
        <Stat label={t("prizes.draw.winners")} value={n(winners)} icon={<Award />} tone="gold" />
      </div>

      <div className="grid gap-6 xl:grid-cols-[1fr_1.2fr]">
        <Card className="lattice bg-night text-white ring-night">
          <h2 className="text-xl font-bold">{t("prizes.draw.grandPrize")}</h2>
          <p className="mt-1 text-sm text-white/70">{t("prizes.draw.rules")}</p>
          <div className="my-5 flex flex-wrap gap-2" role="group" aria-label={t("prizes.draw.entriesFrom")}>
            {[false, true].map((option) => (
              <Link
                key={String(option)}
                href={option ? "?present=1" : "?"}
                aria-current={option === checkedInOnly ? "true" : undefined}
                className={cn("rounded-full px-4 py-1.5 text-sm font-semibold ring-1", option === checkedInOnly ? "bg-white text-ink ring-white" : "text-white/80 ring-white/25 hover:ring-white/60")}
              >
                {option ? t("prizes.draw.checkedInOnly") : t("prizes.draw.allRegistered")}
              </Link>
            ))}
          </div>
          <GrandPrizeDraw
            entryCodes={entries.map((entry) => entry.code)}
            checkedInOnly={checkedInOnly}
            pending={pending ? {id: pending.id, guestCode: pending.guestCode, guestName: pending.guestName, entries: pending.entries} : null}
            disabled={entries.length === 0}
          />
          {!entries.length && !pending ? <p className="mt-3 text-sm text-white/70">{t("errors.noEntries")}</p> : null}
        </Card>

        <Card>
          <CardHeader title={t("prizes.draw.entriesTitle", {count: n(entries.length)})} description={checkedInOnly ? t("prizes.draw.checkedInOnly") : t("prizes.draw.allRegistered")} />
          {entries.length ? (
            <ul className="flex max-h-72 flex-wrap gap-1.5 overflow-y-auto" aria-label={t("prizes.draw.entriesTitle", {count: n(entries.length)})}>
              {entries.map((entry) => (
                <li key={entry.id} title={entry.name} className="rounded-lg bg-paper px-2.5 py-1 font-mono text-xs font-semibold ring-1 ring-line" dir="ltr">
                  {entry.code}
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState title={t("errors.noEntries")} />
          )}
        </Card>
      </div>

      <Card className="mt-6 p-0 sm:p-0">
        <div className="p-5 pb-0 sm:p-6 sm:pb-0">
          <CardHeader title={t("prizes.draw.historyTitle")} />
        </div>
        {draws.length ? (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[40rem] text-sm">
              <thead>
                <tr className="border-y border-line text-xs font-semibold text-muted">
                  <th className="px-5 py-2.5 text-start sm:px-6">{t("prizes.draw.when")}</th>
                  <th className="px-3 py-2.5 text-start">{t("guest.guestId")}</th>
                  <th className="px-3 py-2.5 text-start">{t("staff.guests.name")}</th>
                  <th className="px-3 py-2.5 text-end">{t("prizes.draw.entries")}</th>
                  <th className="px-5 py-2.5 text-start sm:px-6">{t("common.status")}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {draws.map((draw) => (
                  <tr key={draw.id}>
                    <td className="px-5 py-3 whitespace-nowrap text-muted sm:px-6">
                      {formatDateTime(locale, draw.drawnAt)}
                      <span className="block text-xs">{draw.drawnBy}</span>
                    </td>
                    <td className="px-3 py-3 font-mono text-xs font-semibold" dir="ltr">
                      {draw.guestCode}
                    </td>
                    <td className="px-3 py-3 font-semibold">{draw.guestName}</td>
                    <td className="tabular px-3 py-3 text-end">{n(draw.entries)}</td>
                    <td className="px-5 py-3 sm:px-6">
                      <Badge tone={STATUS_TONE[draw.status]}>{t(`prizes.draw.status.${draw.status}`)}</Badge>
                      {draw.finalizedAt ? <span className="mt-1 block text-xs text-muted">{formatDateTime(locale, draw.finalizedAt)}</span> : null}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-5 sm:p-6">
            <EmptyState title={t("prizes.draw.noHistory")} />
          </div>
        )}
      </Card>
    </div>
  );
}
