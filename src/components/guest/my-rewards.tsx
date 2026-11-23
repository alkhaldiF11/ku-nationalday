import {CheckCircle2, Gift, Trophy} from "lucide-react";

import {CollectionBadge, EligibilityBadge, WinRate} from "@/components/prizes/prize-badges";
import {Badge, Card, CardHeader} from "@/components/ui/card";
import type {Guest} from "@/lib/data/guests";
import {type GameResult, TEDDY_THRESHOLD_PERCENT} from "@/lib/data/prizes";
import {formatNumber} from "@/lib/i18n/core";
import {getI18n} from "@/lib/i18n/server";

/** My Games & Rewards — read-only; results are recorded by the IT Desk. */
export async function MyRewardsCard({guest, result, showTitle = true}: {guest: Guest; result: GameResult | null; showTitle?: boolean}) {
  const {t, locale} = await getI18n();
  return (
      <Card>
        <CardHeader
          title={showTitle ? t("prizes.myTitle") : null}
          description={showTitle ? t("prizes.myLede") : undefined}
          action={
            guest.checkedInAt ? (
              <Badge tone="success">
                <CheckCircle2 className="size-3" aria-hidden />
                {t("guest.checkedIn")}
              </Badge>
            ) : (
              <Badge>{t("guest.notCheckedIn")}</Badge>
            )
          }
        />
        <dl className="grid grid-cols-2 gap-2.5 sm:grid-cols-4 sm:gap-3">
          <div className="min-w-0 rounded-2xl bg-paper p-3.5 ring-1 ring-line sm:p-4">
            <dt className="text-xs font-semibold tracking-wide text-muted uppercase">{t("guest.guestId")}</dt>
            <dd className="mt-1 font-display text-xl font-semibold sm:text-2xl" dir="ltr">
              {guest.code}
            </dd>
          </div>
          <div className="min-w-0 rounded-2xl bg-paper p-3.5 ring-1 ring-line sm:p-4">
            <dt className="text-xs font-semibold tracking-wide text-muted uppercase">{t("prizes.played")}</dt>
            <dd className="tabular mt-1 font-display text-xl font-semibold sm:text-2xl">{formatNumber(locale, result?.gamesPlayed ?? 0)}</dd>
          </div>
          <div className="min-w-0 rounded-2xl bg-paper p-3.5 ring-1 ring-line sm:p-4">
            <dt className="text-xs font-semibold tracking-wide text-muted uppercase">{t("prizes.won")}</dt>
            <dd className="tabular mt-1 font-display text-xl font-semibold sm:text-2xl">{formatNumber(locale, result?.gamesWon ?? 0)}</dd>
          </div>
          <div className="min-w-0 rounded-2xl bg-paper p-3.5 ring-1 ring-line sm:p-4">
            <dt className="text-xs font-semibold tracking-wide text-muted uppercase">{t("prizes.winRate")}</dt>
            <dd className="mt-1">
              <WinRate rate={result?.winRate ?? null} />
            </dd>
          </div>
        </dl>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <div className="flex items-center justify-between gap-3 rounded-2xl bg-gold-wash/70 p-4 ring-1 ring-gold/20">
            <div className="flex items-center gap-3">
              <Gift className="size-6 text-gold" aria-hidden />
              <div>
                <p className="font-bold">{t("prizes.teddyLabel")}</p>
                <p className="text-xs text-muted">{t("prizes.rule", {threshold: TEDDY_THRESHOLD_PERCENT})}</p>
              </div>
            </div>
            <div className="flex flex-col items-end gap-1">
              <EligibilityBadge played={result?.gamesPlayed ?? 0} eligible={result?.eligible ?? false} />
              {result?.eligible ? <CollectionBadge eligible collectedAt={result.teddyCollectedAt} /> : null}
            </div>
          </div>
          <div className="flex items-center gap-3 rounded-2xl bg-night p-4 text-white">
            <Trophy className="size-6 shrink-0 text-gold" aria-hidden />
            <div>
              <p className="font-bold">{t("prizes.draw.grandPrize")}</p>
              <p className="text-xs text-white/70">{t("prizes.grandPrizeEntry", {code: guest.code})}</p>
            </div>
          </div>
        </div>
      </Card>
  );
}
