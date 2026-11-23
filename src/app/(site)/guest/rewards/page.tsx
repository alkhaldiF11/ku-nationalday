import type {Metadata} from "next";

import {MyRewardsCard} from "@/components/guest/my-rewards";
import {AwardsHistory, MyRankSection} from "@/components/ranks/my-rank";
import {requireGuestPage} from "@/lib/auth/guards";
import {guestRank} from "@/lib/data/attendance";
import {getSettings} from "@/lib/data/content";
import {getGameResult} from "@/lib/data/prizes";
import {guestAwards} from "@/lib/data/winners";
import {formatDay} from "@/lib/i18n/core";
import {getI18n} from "@/lib/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  const {t} = await getI18n();
  return {title: t("prizes.myTitle")};
}

/** The guest's own games, win rate and prize status (read-only; the IT Desk records results). */
export default async function GuestRewardsPage() {
  const guest = await requireGuestPage();
  const {t, locale} = await getI18n();
  const settings = await getSettings();
  const rank = await guestRank(guest.id);
  const result = await getGameResult(guest.id); // the signed-in guest's own record only

  return (
    <div className="mx-auto max-w-4xl space-y-5">
      <header className="animate-rise">
        <h1 className="font-display text-[1.75rem] font-semibold tracking-tight sm:text-4xl">{t("prizes.myTitle")}</h1>
        <p className="mt-1.5 text-[15px] text-ink-soft sm:text-base">{t("prizes.myLede")}</p>
      </header>
      <MyRankSection info={rank} guest={{fullName: guest.fullName, code: guest.code}} date={formatDay(locale, settings.eventDate, "short")} eventName={settings.eventName} />
      <MyRewardsCard guest={guest} result={result} showTitle={false} />
      <AwardsHistory awards={await guestAwards(guest.id)} />
    </div>
  );
}
