"use client";

import {CheckCircle2, Gift, Minus, XCircle} from "lucide-react";

import {Badge} from "@/components/ui/card";
import {useI18n} from "@/lib/i18n/client";
import {formatNumber} from "@/lib/i18n/core";
import {cn} from "@/lib/utils/cn";

export const TEDDY_THRESHOLD = 75;

/** Win rate with a bar marked at the 75% teddy-bear threshold. */
export function WinRate({rate, size = "md", inline = false}: {rate: number | null; size?: "md" | "lg"; inline?: boolean}) {
  const {locale} = useI18n();
  const qualifies = rate !== null && rate >= TEDDY_THRESHOLD;
  if (inline) {
    return <span className={cn("tabular font-bold", qualifies ? "text-success" : "text-ink")}>{rate === null ? "—" : `${formatNumber(locale, rate)}%`}</span>;
  }
  return (
    <div className={cn("min-w-24", size === "lg" && "min-w-40")}>
      <p className={cn("tabular font-bold", size === "lg" ? "font-display text-4xl" : "text-sm", qualifies ? "text-success" : "text-ink")}>
        {rate === null ? "—" : `${formatNumber(locale, rate)}%`}
      </p>
      <div className={cn("relative mt-1 overflow-hidden rounded-full bg-paper-deep", size === "lg" ? "h-2.5" : "h-1.5")} aria-hidden>
        <div className={cn("h-full rounded-full", qualifies ? "bg-success" : "bg-crimson/70")} style={{width: `${Math.min(100, rate ?? 0)}%`}} />
        <span className="absolute inset-y-0 w-0.5 bg-ink/40" style={{insetInlineStart: `${TEDDY_THRESHOLD}%`}} />
      </div>
    </div>
  );
}

export function EligibilityBadge({played, eligible}: {played: number; eligible: boolean}) {
  const {t} = useI18n();
  if (played === 0) {
    return (
      <Badge>
        <Minus className="size-3" aria-hidden />
        {t("prizes.noGamesYet")}
      </Badge>
    );
  }
  return eligible ? (
    <Badge tone="success">
      <CheckCircle2 className="size-3" aria-hidden />
      {t("prizes.qualified")}
    </Badge>
  ) : (
    <Badge tone="danger">
      <XCircle className="size-3" aria-hidden />
      {t("prizes.notQualified")}
    </Badge>
  );
}

export function CollectionBadge({eligible, collectedAt}: {eligible: boolean; collectedAt: string | null}) {
  const {t} = useI18n();
  if (collectedAt) {
    return (
      <Badge tone="gold">
        <Gift className="size-3" aria-hidden />
        {t("prizes.collected")}
      </Badge>
    );
  }
  return eligible ? <Badge tone="crimson">{t("prizes.readyToCollect")}</Badge> : <Badge>{t("prizes.notApplicable")}</Badge>;
}
