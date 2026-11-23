import Link from "next/link";
import {ArrowRight, Gamepad2, Gift, PackageCheck, Trophy, UserRoundCheck, UserRoundPlus, Users} from "lucide-react";

import {RegistrationStatistics} from "@/components/staff/registration-stats";
import {Card, CardHeader, EmptyState, PageHeader, Stat} from "@/components/ui/card";
import {requireStaffPage} from "@/lib/auth/guards";
import {listAudit} from "@/lib/data/audit";
import {dashboardStats} from "@/lib/data/content";
import {GUEST_CATEGORIES} from "@/lib/data/guests";
import {prizeStats} from "@/lib/data/prizes";
import {formatNumber, relativeTime, type Locale} from "@/lib/i18n/core";
import {getI18n} from "@/lib/i18n/server";

export default async function StaffDashboard({searchParams}: PageProps<"/staff">) {
  await requireStaffPage(["admin"]);
  const {category} = await searchParams;
  const selectedCategory = GUEST_CATEGORIES.find((item) => item === category) ?? null;
  const {t, locale} = await getI18n();
  const stats = await dashboardStats();
  const prizes = await prizeStats();
  const {entries} = await listAudit({limit: 10});
  const checkedInPercent = stats.guests ? Math.round((stats.checkedIn / stats.guests) * 100) : 0;
  const n = (value: number) => formatNumber(locale, value);

  return (
    <div>
      <PageHeader eyebrow={t("staff.sections.overview")} title={t("staff.dashboard.title")} description={t("staff.dashboard.lede")} />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label={t("staff.dashboard.guests")} value={n(stats.guests)} icon={<Users />} tone="crimson" />
        <Stat label={t("staff.dashboard.checkedIn")} value={n(stats.checkedIn)} hint={t("staff.dashboard.ofGuests", {percent: n(checkedInPercent)})} icon={<UserRoundCheck />} tone="success" />
        <Stat label={t("staff.dashboard.resultsRecorded")} value={n(prizes.recorded)} icon={<Gamepad2 />} />
        <Stat label={t("staff.dashboard.teddyQualified")} value={n(prizes.eligible)} icon={<Gift />} tone="success" />
        <Stat label={t("staff.dashboard.teddyCollected")} value={n(prizes.collected)} hint={t("staff.dashboard.teddyRemaining", {count: n(prizes.eligible - prizes.collected)})} icon={<PackageCheck />} tone="gold" />
        <Stat label={t("staff.dashboard.grandPrizeWinners")} value={n(prizes.grandPrizeWinners)} icon={<Trophy />} tone="gold" />
        <QuickActions t={t} />
      </div>

      <RegistrationStatistics selected={selectedCategory} />

      <div className="mt-6 grid gap-6 xl:grid-cols-[1fr_1.3fr]">
        <Card>
          <CardHeader title={t("staff.dashboard.registrations")} />
          <RegistrationChart data={stats.registrationsByHour} locale={locale} empty={t("staff.dashboard.noRegistrations")} />
        </Card>
        <Card>
          <CardHeader
            title={t("staff.dashboard.recent")}
            action={
              <Link href="/staff/activity" className="inline-flex items-center gap-1 text-sm font-semibold text-crimson hover:underline">
                {t("common.viewAll")}
                <ArrowRight className="size-4 rtl:-scale-x-100" aria-hidden />
              </Link>
            }
          />
          {entries.length ? (
            <ul className="space-y-3">
              {entries.map((entry) => (
                <li key={entry.id} className="flex gap-3 text-sm">
                  <span className="mt-1.5 size-2 shrink-0 rounded-full bg-crimson" aria-hidden />
                  <div className="min-w-0">
                    <p className="text-ink">
                      <span className="font-semibold">{entry.actorName}</span> <span className="text-muted">·</span> <code className="text-xs text-ink-soft">{entry.action}</code>
                    </p>
                    <p className="truncate text-ink-soft">{entry.details}</p>
                    <p className="text-xs text-muted">{relativeTime(locale, entry.createdAt)}</p>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState title={t("staff.activity.empty")} />
          )}
        </Card>
      </div>
    </div>
  );
}

function QuickActions({t}: {t: (key: "staff.dashboard.quick" | "staff.nav.reception" | "staff.nav.results" | "staff.nav.draw") => string}) {
  return (
    <div className="col-span-2 flex flex-col justify-between rounded-2xl bg-night p-4 text-white lg:col-span-1">
      <p className="text-xs font-semibold tracking-wide text-white/60 uppercase">{t("staff.dashboard.quick")}</p>
      <div className="mt-3 space-y-1.5">
        <Link href="/staff/reception" className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm font-semibold hover:bg-white/10">
          <UserRoundPlus className="size-4 text-crimson" aria-hidden />
          {t("staff.nav.reception")}
        </Link>
        <Link href="/staff/prizes/results" className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm font-semibold hover:bg-white/10">
          <Gamepad2 className="size-4 text-crimson" aria-hidden />
          {t("staff.nav.results")}
        </Link>
        <Link href="/staff/prizes/draw" className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm font-semibold hover:bg-white/10">
          <Trophy className="size-4 text-crimson" aria-hidden />
          {t("staff.nav.draw")}
        </Link>
      </div>
    </div>
  );
}

/** Lightweight SVG bar chart — registrations per hour (Bahrain time). */
function RegistrationChart({data, locale, empty}: {data: Array<{hour: string; n: number}>; locale: Locale; empty: string}) {
  if (!data.length) {
    return <EmptyState title={empty} />;
  }
  const max = Math.max(...data.map((item) => item.n), 1);
  const hourLabel = (hour: string) =>
    new Intl.DateTimeFormat(locale === "ar" ? "ar-BH" : "en-GB", {hour: "numeric", timeZone: "Asia/Bahrain"}).format(new Date(`${hour}:00:00Z`));
  return (
    <div className="flex h-48 items-end gap-2" role="img" aria-label={data.map((item) => `${hourLabel(item.hour)}: ${item.n}`).join(", ")}>
      {data.map((item) => (
        <div key={item.hour} className="flex flex-1 flex-col items-center gap-1.5">
          <span className="tabular text-xs font-semibold text-ink-soft">{formatNumber(locale, item.n)}</span>
          <div className="w-full max-w-10 rounded-t-lg bg-crimson/85" style={{height: `${Math.max(6, (item.n / max) * 140)}px`}} />
          <span className="text-[10px] whitespace-nowrap text-muted">{hourLabel(item.hour)}</span>
        </div>
      ))}
    </div>
  );
}
