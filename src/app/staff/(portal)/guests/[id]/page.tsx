import Link from "next/link";
import {notFound} from "next/navigation";
import {ArrowLeft, Pencil, Trophy} from "lucide-react";

import {CollectionBadge, EligibilityBadge, WinRate} from "@/components/prizes/prize-badges";
import {RankEmblem} from "@/components/ranks/rank-emblem";
import {GuestAdminActions, GuestEditForm} from "@/components/staff/admin/guest-admin";
import {AttendanceEditor} from "@/components/staff/admin/rank-admin";
import {buttonClass} from "@/components/ui/button";
import {Badge, Card, CardHeader, Stat} from "@/components/ui/card";
import {requireStaffPage} from "@/lib/auth/guards";
import {currentEventYear, guestRank} from "@/lib/data/attendance";
import {getGuestById} from "@/lib/data/guests";
import {guestAwards} from "@/lib/data/winners";
import {getGameResult, listDraws} from "@/lib/data/prizes";
import {formatDateTime, formatNumber} from "@/lib/i18n/core";
import {getI18n} from "@/lib/i18n/server";

export default async function GuestDetailPage({params}: PageProps<"/staff/guests/[id]">) {
  await requireStaffPage(["admin"]);
  const {id} = await params;
  const guest = await getGuestById(id);
  if (!guest) {
    notFound();
  }
  const {t, locale} = await getI18n();
  const result = await getGameResult(guest.id);
  const draws = (await listDraws()).filter((draw) => draw.guestCode === guest.code);
  const n = (value: number) => formatNumber(locale, value);
  const rank = await guestRank(guest.id);
  const awards = await guestAwards(guest.id);

  return (
    <div className="max-w-5xl">
      <Link href="/staff/guests" className="mb-4 inline-flex items-center gap-1.5 text-sm font-semibold text-muted hover:text-ink">
        <ArrowLeft className="size-4 rtl:-scale-x-100" aria-hidden />
        {t("staff.guests.title")}
      </Link>

      <header className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="font-mono text-sm font-semibold text-crimson" dir="ltr">
            {guest.code}
          </p>
          <h1 className="font-display text-4xl font-semibold tracking-tight">{guest.fullName}</h1>
          <div className="mt-2 flex flex-wrap gap-2">
            {guest.isActive ? <Badge tone="success">{t("common.active")}</Badge> : <Badge tone="danger">{t("common.inactive")}</Badge>}
            <Badge>{t(`staff.guests.sources.${guest.source}`)}</Badge>
          </div>
        </div>
        <GuestAdminActions guest={{id: guest.id, code: guest.code, fullName: guest.fullName, isActive: guest.isActive}} />
      </header>

      <div className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat label={t("prizes.played")} value={n(result?.gamesPlayed ?? 0)} />
        <Stat label={t("prizes.won")} value={n(result?.gamesWon ?? 0)} tone="success" />
        <Stat label={t("prizes.winRate")} value={result?.winRate === null || !result ? "—" : `${n(result.winRate)}%`} tone="gold" />
        <Stat label={t("staff.guests.checkIn")} value={<span className="text-base">{guest.checkedInAt ? formatDateTime(locale, guest.checkedInAt) : t("staff.guests.notCheckedIn")}</span>} />
      </div>

      {/* Attendance & rank (administrators only; ranks come from verified attendance) */}
      <Card className="mb-6">
        <CardHeader
          title={t("staff.attendance.title")}
          action={
            <span className="inline-flex items-center gap-2 font-semibold">
              {rank.rank ? <RankEmblem rank={rank.rank} size={30} wreath={false} /> : null}
              {rank.rank ? t(`ranks.${rank.rank}.title`) : t("staff.ranks.none")} · {t("ranks.events", {count: n(rank.attended)})}
            </span>
          }
        />
        <AttendanceEditor guestId={guest.id} guestCode={guest.code} years={rank.history.map((record) => record.year)} currentYear={await currentEventYear()} />
        {awards.length ? (
          <ul className="mt-4 space-y-1.5 border-t border-line pt-4 text-sm">
            {awards.map((award) => (
              <li key={award.id} className="flex items-center gap-2">
                <Trophy className="size-4 shrink-0 text-gold" aria-hidden />
                <span className="font-semibold" dir="auto">{award.prize}</span>
                <span className="text-xs text-muted">· {formatDateTime(locale, award.announcedAt)}</span>
              </li>
            ))}
          </ul>
        ) : null}
      </Card>

      <div className="grid gap-6 lg:grid-cols-[1.2fr_1fr]">
        <Card>
          <CardHeader title={t("staff.guests.edit")} />
          <GuestEditForm guest={{id: guest.id, fullName: guest.fullName, phone: guest.phone ?? "", email: guest.email ?? "", notes: guest.notes ?? ""}} />
        </Card>
        <Card>
          <CardHeader
            title={t("prizes.myTitle")}
            action={
              <Link href={`/staff/prizes/results?guest=${encodeURIComponent(guest.code)}`} className={buttonClass("secondary", "sm")}>
                <Pencil className="size-4" aria-hidden />
                {t("prizes.results.editAtDesk")}
              </Link>
            }
          />
          {result ? (
            <dl className="space-y-3 text-sm">
              <div className="flex items-center justify-between gap-3">
                <dt className="text-muted">{t("prizes.winRate")}</dt>
                <dd>
                  <WinRate rate={result.winRate} />
                </dd>
              </div>
              <div className="flex items-center justify-between gap-3">
                <dt className="text-muted">{t("prizes.teddyLabel")}</dt>
                <dd>
                  <EligibilityBadge played={result.gamesPlayed} eligible={result.eligible} />
                </dd>
              </div>
              <div className="flex items-center justify-between gap-3">
                <dt className="text-muted">{t("prizes.collectionStatus")}</dt>
                <dd className="text-end">
                  <CollectionBadge eligible={result.eligible} collectedAt={result.teddyCollectedAt} />
                  {result.teddyCollectedAt ? <span className="mt-1 block text-xs text-muted">{formatDateTime(locale, result.teddyCollectedAt)}</span> : null}
                </dd>
              </div>
              <p className="border-t border-line pt-3 text-xs text-muted">
                {result.recordedBy} · {formatDateTime(locale, result.updatedAt)}
              </p>
            </dl>
          ) : (
            <p className="text-sm text-muted">{t("prizes.noResultsYet")}</p>
          )}
          {draws.length ? (
            <ul className="mt-4 space-y-2 border-t border-line pt-4">
              {draws.map((draw) => (
                <li key={draw.id} className="flex items-center justify-between gap-3 text-sm">
                  <span className="inline-flex items-center gap-2 font-semibold">
                    <Trophy className="size-4 text-gold" aria-hidden />
                    {t("prizes.draw.grandPrize")}
                  </span>
                  <Badge tone={draw.status === "final" ? "success" : "neutral"}>{t(`prizes.draw.status.${draw.status}`)}</Badge>
                </li>
              ))}
            </ul>
          ) : null}
        </Card>
      </div>
    </div>
  );
}
