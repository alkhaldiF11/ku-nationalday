import {RankEmblem} from "@/components/ranks/rank-emblem";
import {FlagMark} from "@/components/ui/flag-mark";
import {getI18n} from "@/lib/i18n/server";
import type {Rank} from "@/lib/ranks";
import {cn} from "@/lib/utils/cn";

import {RANK_THEME} from "./rank-theme";

/**
 * Guest rank card: the guest pass identity (flag, "Guest pass", name, event) with the rank
 * emblem as the centrepiece. Information only — the scannable pass with the QR code stays
 * the separate GuestPass.
 */
export async function RankCard({rank, fullName, code, date, eventName}: {rank: Rank | null; fullName: string; code: string; date: string; eventName: string}) {
  const {t} = await getI18n();
  const theme = RANK_THEME[rank ?? "none"];
  const key = rank ?? "none";

  return (
    <article
      className="relative mx-auto w-full max-w-sm overflow-hidden rounded-[1.75rem] shadow-[var(--shadow-lift)] ring-1 ring-black/5"
      style={{background: theme.background}}
      aria-label={`${t("ranks.cardLabel")}: ${t(`ranks.${key}.title`)}`}
      data-rank={key}
    >
      {/* Flag band */}
      <div className="relative h-16">
        <div className="absolute inset-y-0 start-0 w-[70%] overflow-hidden rounded-ee-[2.25rem]">
          <FlagMark cover />
        </div>
        <span className="absolute end-4 top-4 rounded-full bg-white/95 px-3 py-1 text-xs font-bold text-crimson shadow-sm ring-1 ring-black/5">{t("guest.passLabel")}</span>
      </div>

      <div className="px-5 pt-5 text-center">
        <p className="flex items-center justify-center gap-2">
          <span className="min-w-0 truncate text-xl font-bold text-ink">
            <bdi>{fullName}</bdi>
          </span>
          {rank ? <RankEmblem rank={rank} size={26} wreath={false} className="shrink-0" /> : null}
        </p>
        <p className="mt-0.5 text-sm text-ink-soft">{eventName}</p>
      </div>

      {/* The emblem is the centrepiece */}
      <div className="flex justify-center pt-2">
        <RankEmblem rank={rank ?? "silver"} size={196} muted={!rank} />
      </div>

      <div className="px-5 pb-5 text-center">
        <p className="font-display text-2xl font-semibold" style={{color: theme.title}}>
          {t(`ranks.${key}.title`)}
        </p>
        <p className="mt-1.5 flex items-center justify-center gap-3 text-xs font-bold tracking-[0.28em]" style={{color: theme.title}} dir="ltr">
          <span className="h-px w-10" style={{background: theme.line}} aria-hidden />
          {t(`ranks.${key}.label`)}
          <span className="h-px w-10" style={{background: theme.line}} aria-hidden />
        </p>
      </div>

      {/* Guest ID panel */}
      <div className={cn("mx-3 mb-3 flex items-end justify-between gap-3 rounded-[1.25rem] bg-white/90 px-5 py-4 shadow-sm ring-1 ring-black/5")}>
        <div className="min-w-0">
          <p className="text-xs font-semibold text-muted">{t("guest.guestId")}</p>
          <p className="font-display text-[1.75rem] leading-tight font-semibold tracking-tight text-ink" dir="ltr">
            {code}
          </p>
        </div>
        <p className="shrink-0 text-sm text-muted">{date}</p>
      </div>
    </article>
  );
}
