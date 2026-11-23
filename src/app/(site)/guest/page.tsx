import type {Metadata} from "next";
import Link from "next/link";
import {ArrowRight, CalendarClock, Clock3, Megaphone} from "lucide-react";

import {GuestPass} from "@/components/guest/guest-pass";
import {FamilyCard} from "@/components/guest/family-card";
import {MyRewardsCard} from "@/components/guest/my-rewards";
import {RankSummary} from "@/components/ranks/my-rank";
import {Card, CardHeader} from "@/components/ui/card";
import {requireGuestPage} from "@/lib/auth/guards";
import {getSettings, listActivities, listAnnouncements, localizeActivity} from "@/lib/data/content";
import {guestRank} from "@/lib/data/attendance";
import {listFamily} from "@/lib/data/guests";
import {getGameResult} from "@/lib/data/prizes";
import {activityStatus, currentOrNext} from "@/lib/event-time";
import {formatClock, formatDay, relativeTime} from "@/lib/i18n/core";
import {getI18n} from "@/lib/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  const {t} = await getI18n();
  return {title: t("nav.myPass")};
}

export default async function GuestHomePage() {
  const guest = await requireGuestPage();
  const {t, locale} = await getI18n();
  const settings = await getSettings();
  const result = await getGameResult(guest.id); // the signed-in guest's own record only
  const family = guest.registrationId ? await listFamily(guest.registrationId) : [];
  const rank = await guestRank(guest.id);
  const next = currentOrNext(await listActivities());
  const news = await listAnnouncements({limit: 5});

  return (
    <div className="space-y-6 sm:space-y-8">
      <header className="animate-rise">
        <h1 className="font-display text-[1.75rem] font-semibold tracking-tight sm:text-4xl lg:text-5xl">{t("guest.greeting", {name: guest.fullName.split(" ")[0]})}</h1>
        <p className="mt-1.5 text-[15px] text-ink-soft sm:mt-2 sm:text-base">{t("guest.lede")}</p>
      </header>

      <div className="grid grid-cols-[minmax(0,1fr)] gap-6 sm:gap-8 lg:grid-cols-[minmax(0,22rem)_minmax(0,1fr)]">
        <div className="min-w-0 lg:sticky lg:top-24 lg:self-start">
          <GuestPass code={guest.code} fullName={guest.fullName} eventName={settings.eventName} venue={settings.eventVenue} date={formatDay(locale, settings.eventDate, "short")} rank={rank.rank} />
        </div>

        <div className="no-print min-w-0 space-y-6">
          <RankSummary rank={rank.rank} attended={rank.attended} />
          <MyRewardsCard guest={guest} result={result} />

          {family.length > 1 ? <FamilyCard members={family} /> : null}

          <Card className="overflow-hidden p-0 sm:p-0">
            <div className="flex flex-wrap items-center gap-5 bg-night p-6 text-white">
              <span className="grid size-12 place-items-center rounded-2xl bg-crimson">
                <CalendarClock className="size-6" aria-hidden />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-bold tracking-[0.14em] text-white/60 uppercase">{next && activityStatus(next) === "now" ? t("programme.now") : t("guest.nextUp")}</p>
                {next ? (
                  <>
                    <p className="mt-1 text-xl font-bold">{localizeActivity(next, locale).title}</p>
                    <p className="mt-1 flex flex-wrap gap-x-4 text-sm text-white/70">
                      <span className="inline-flex items-center gap-1.5">
                        <Clock3 className="size-3.5" aria-hidden />
                        {formatDay(locale, next.date, "short")} · {formatClock(locale, next.startTime)}
                      </span>
                      <span>{localizeActivity(next, locale).location}</span>
                    </p>
                  </>
                ) : (
                  <p className="mt-1 font-semibold">{t("guest.nothingNext")}</p>
                )}
              </div>
              <Link href="/programme" className="inline-flex basis-full items-center gap-1.5 text-sm font-semibold text-white/80 hover:text-white sm:basis-auto">
                {t("guest.seeProgramme")}
                <ArrowRight className="size-4 rtl:-scale-x-100" aria-hidden />
              </Link>
            </div>
          </Card>

          <Card>
              <CardHeader title={t("guest.newsTitle")} />
            {news.length ? (
              <ul className="space-y-4">
                {news.map((item) => (
                  <li key={item.id} className="flex gap-3">
                    <Megaphone className="mt-0.5 size-4 shrink-0 text-crimson" aria-hidden />
                    <div>
                      <p className="font-semibold" dir="auto">{item.title}</p>
                      <p className="mt-0.5 text-sm leading-relaxed text-ink-soft" dir="auto">{item.body}</p>
                      <p className="mt-1 text-xs text-muted">{relativeTime(locale, item.createdAt)}</p>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-muted">{t("guest.noNews")}</p>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
