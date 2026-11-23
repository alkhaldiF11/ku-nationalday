"use client";

import {Printer} from "lucide-react";

import {Button} from "@/components/ui/button";
import {FlagMark} from "@/components/ui/flag-mark";
import {KuMark} from "@/components/ui/ku-logo";
import {RankEmblem} from "@/components/ranks/rank-emblem";
import {RANK_THEME} from "@/components/ranks/rank-theme";
import {useI18n} from "@/lib/i18n/client";
import type {Rank} from "@/lib/ranks";

/** QR payload format shared with the staff scanner (see normalizeGuestCode). */
export const qrPayload = (code: string) => `NDG:${code}`;

export function GuestPass({code, fullName, eventName, venue, date, rank, printable = true}: {code: string; fullName: string; eventName: string; venue: string; date: string; rank: Rank | null; printable?: boolean}) {
  const {t} = useI18n();
  const key = rank ?? "none";
  const theme = RANK_THEME[key];
  return (
    <div>
      <article className="relative mx-auto max-w-sm overflow-hidden rounded-[1.75rem] bg-card shadow-[var(--shadow-lift)] ring-1 ring-line print:shadow-none print:ring-ink" aria-label={t("guest.passLabel")}>
        <div className="relative h-28 overflow-hidden">
          <FlagMark cover />
          <div className="absolute inset-0 flex items-start justify-end p-4">
            <span className="rounded-full bg-white/95 px-3 py-1 text-[11px] font-bold tracking-[0.14em] text-crimson uppercase">{t("guest.passLabel")}</span>
          </div>
        </div>
        <div className="px-5 pt-5 pb-6 sm:px-6">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="line-clamp-2 text-xl leading-snug font-bold break-words">
                <bdi>{fullName}</bdi>
              </p>
              <p className="mt-0.5 text-sm text-muted">{eventName}</p>
            </div>
            <KuMark size={40} />
          </div>
          {/* The guest's rank (from verified attendance) is the centrepiece of the pass. */}
          <div className="mt-5 rounded-2xl px-3 pt-2 pb-4 text-center ring-1 ring-black/5" style={{background: theme.background}} data-rank={key}>
            <div className="flex justify-center">
              <RankEmblem rank={rank ?? "silver"} size={184} muted={!rank} />
            </div>
            <p className="font-display text-2xl font-semibold" style={{color: theme.title}}>
              {t(`ranks.${key}.title`)}
            </p>
            <p className="mt-1 flex items-center justify-center gap-3 text-[11px] font-bold tracking-[0.28em]" style={{color: theme.title}} dir="ltr">
              <span className="h-px w-8" style={{background: theme.line}} aria-hidden />
              {t(`ranks.${key}.label`)}
              <span className="h-px w-8" style={{background: theme.line}} aria-hidden />
            </p>
          </div>
          <div className="mt-5 flex items-end justify-between gap-3 border-t border-dashed border-line-strong pt-4">
            <div>
              <p className="text-xs font-semibold text-muted">{t("guest.guestId")}</p>
              <p className="font-display text-[1.75rem] font-semibold tracking-tight sm:text-3xl" dir="ltr">
                {code}
              </p>
            </div>
            <div className="min-w-0 flex-1 text-end text-xs text-muted">
              <p>{date}</p>
              <p className="ms-auto max-w-44 leading-snug break-words">{venue}</p>
            </div>
          </div>
        </div>
      </article>
      {printable ? (
        <div className="no-print mt-4 flex justify-center">
          <Button variant="ghost" size="sm" onClick={() => window.print()}>
            <Printer className="size-4" aria-hidden />
            {t("guest.printPass")}
          </Button>
        </div>
      ) : null}
    </div>
  );
}
