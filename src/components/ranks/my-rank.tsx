import Link from "next/link";
import {CalendarCheck2, ChevronLeft, Trophy} from "lucide-react";

import {RankCard} from "@/components/ranks/rank-card";
import {RankEmblem} from "@/components/ranks/rank-emblem";
import {Card, CardHeader} from "@/components/ui/card";
import type {AttendanceRecord} from "@/lib/data/attendance";
import type {WinnerAnnouncement} from "@/lib/data/winners";
import {formatDateTime, formatNumber} from "@/lib/i18n/core";
import {getI18n} from "@/lib/i18n/server";
import type {RankProgress} from "@/lib/ranks";

type RankInfo = RankProgress & {history: AttendanceRecord[]};

/** "My rank": the rank card plus current rank, total attendance, progress and yearly history. */
export async function MyRankSection({info, guest, date, eventName}: {info: RankInfo; guest: {fullName: string; code: string}; date: string; eventName: string}) {
  const {t, locale} = await getI18n();
  const n = (value: number) => formatNumber(locale, value);
  const key = info.rank ?? "none";

  return (
    <Card id="rank" className="scroll-mt-20">
      <CardHeader title={t("ranks.sectionTitle")} description={t("ranks.sectionLede")} />
      <div className="grid gap-6 md:grid-cols-[minmax(0,22rem)_minmax(0,1fr)] md:items-start">
        <RankCard rank={info.rank} fullName={guest.fullName} code={guest.code} date={date} eventName={eventName} />

        <div className="min-w-0 space-y-4">
          <div>
            <p className="text-xs font-semibold text-muted">{t("ranks.current")}</p>
            <p className="font-display text-2xl font-semibold" data-testid="current-rank">
              {t(`ranks.${key}.title`)}
            </p>
            <p className="mt-1 text-[15px] text-ink-soft">{t(`ranks.${key}.body`)}</p>
          </div>

          <dl className="grid grid-cols-2 gap-2.5">
            <div className="rounded-2xl bg-paper p-3.5 ring-1 ring-line">
              <dt className="text-xs font-semibold text-muted">{t("ranks.total")}</dt>
              <dd className="tabular mt-0.5 font-display text-xl font-semibold" data-testid="attendance-total">
                {t("ranks.events", {count: n(info.attended)})}
              </dd>
            </div>
            <div className="rounded-2xl bg-paper p-3.5 ring-1 ring-line">
              <dt className="text-xs font-semibold text-muted">{t("ranks.next")}</dt>
              <dd className="mt-0.5 flex items-center gap-2 font-semibold">
                {info.next ? (
                  <>
                    <RankEmblem rank={info.next} size={22} wreath={false} />
                    {t(`ranks.${info.next}.title`)}
                  </>
                ) : (
                  <span className="text-success">{t("ranks.top")}</span>
                )}
              </dd>
            </div>
          </dl>

          {info.next && info.nextAt !== null ? (
            <div>
              <div className="mb-1.5 flex justify-between text-sm font-semibold">
                <span>{t("ranks.progress", {attended: n(info.attended), needed: n(info.nextAt)})}</span>
                <span className="tabular text-muted">{n(info.percent)}%</span>
              </div>
              <div className="h-2.5 overflow-hidden rounded-full bg-paper-deep" role="progressbar" aria-valuemin={0} aria-valuemax={info.nextAt} aria-valuenow={info.attended}>
                <div className="h-full rounded-full bg-gradient-to-r from-gold to-crimson rtl:bg-gradient-to-l" style={{width: `${Math.max(4, info.percent)}%`}} />
              </div>
            </div>
          ) : null}

          <div>
            <h3 className="mb-2 text-sm font-bold text-muted">{t("ranks.history")}</h3>
            {info.history.length ? (
              <ul className="divide-y divide-line rounded-2xl ring-1 ring-line">
                {info.history.map((record) => (
                  <li key={record.year} className="flex items-center gap-3 px-4 py-2.5">
                    <CalendarCheck2 className="size-5 shrink-0 text-success" aria-hidden />
                    <span className="tabular font-bold">{t("gallery.yearAlbum", {year: record.year})}</span>
                    <span className="ms-auto text-xs text-muted">{record.source === "checkin" ? t("ranks.viaCheckin") : t("ranks.viaAdmin")}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="rounded-2xl border border-dashed border-line-strong bg-paper px-4 py-5 text-center text-sm text-muted">{t("ranks.noHistory")}</p>
            )}
          </div>
        </div>
      </div>
    </Card>
  );
}

/** Compact rank row for the pass page, linking to the full section. */
export async function RankSummary({rank, attended}: {rank: RankProgress["rank"]; attended: number}) {
  const {t, locale} = await getI18n();
  return (
    <Link href="/guest/rewards#rank" className="flex items-center gap-4 rounded-[var(--radius-card)] bg-card p-4 shadow-[var(--shadow-card)] ring-1 ring-line transition hover:ring-ink/30">
      <RankEmblem rank={rank ?? "silver"} size={64} muted={!rank} />
      <span className="min-w-0 flex-1">
        <span className="block text-xs font-semibold text-muted">{t("ranks.current")}</span>
        <span className="block font-display text-lg font-semibold">{t(`ranks.${rank ?? "none"}.title`)}</span>
        <span className="block text-sm text-ink-soft">{t("ranks.events", {count: formatNumber(locale, attended)})}</span>
      </span>
      <span className="inline-flex items-center gap-1 text-sm font-semibold text-crimson">
        {t("ranks.viewRank")}
        <ChevronLeft className="size-4 ltr:rotate-180" aria-hidden />
      </span>
    </Link>
  );
}

/** The guest's awards history (stays after the pop-up is dismissed). */
export async function AwardsHistory({awards}: {awards: WinnerAnnouncement[]}) {
  const {t, locale} = await getI18n();
  return (
    <Card>
      <CardHeader title={t("awards.historyTitle")} />
      {awards.length ? (
        <ul className="space-y-2.5">
          {awards.map((award) => (
            <li key={award.id} className="flex items-start gap-3 rounded-2xl bg-gold-wash/60 p-4 ring-1 ring-gold/20">
              <Trophy className="mt-0.5 size-6 shrink-0 text-gold" aria-hidden />
              <div className="min-w-0">
                <p className="font-bold" dir="auto">{award.prize}</p>
                {award.message ? <p className="mt-0.5 text-sm text-ink-soft" dir="auto">{award.message}</p> : null}
                <p className="mt-1 text-xs text-muted">{t("awards.announcedOn", {date: formatDateTime(locale, award.announcedAt)})}</p>
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <p className="rounded-2xl border border-dashed border-line-strong bg-paper px-4 py-5 text-center text-sm text-muted">{t("awards.historyEmpty")}</p>
      )}
    </Card>
  );
}
