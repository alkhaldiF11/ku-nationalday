"use client";

import {useSyncExternalStore} from "react";

import {useI18n} from "@/lib/i18n/client";
import {formatNumber} from "@/lib/i18n/core";
import {cn} from "@/lib/utils/cn";

/** A once-per-second clock. Server render returns null so the first paint matches hydration. */
function subscribe(onTick: () => void) {
  const timer = window.setInterval(onTick, 1000);
  return () => window.clearInterval(timer);
}
const getNow = () => Math.floor(Date.now() / 1000) * 1000;
const getServerNow = () => null;

export function Countdown({start, end, label: heading, tone = "light"}: {start: number; end: number; label?: string; tone?: "light" | "dark"}) {
  const {t, locale} = useI18n();
  const now = useSyncExternalStore(subscribe, getNow, getServerNow);

  const label = tone === "light" ? "text-muted" : "text-white/70";

  if (now !== null && now >= end) {
    return <p className={cn("font-semibold", label)}>{t("home.countdownOver")}</p>;
  }
  if (now !== null && now >= start) {
    return (
      <p className="inline-flex items-center gap-2 font-semibold text-crimson">
        <span className="relative flex size-2.5">
          <span className="absolute inline-flex size-full animate-ping rounded-full bg-crimson opacity-60" />
          <span className="relative inline-flex size-2.5 rounded-full bg-crimson" />
        </span>
        {t("home.countdownLive")}
      </p>
    );
  }

  const remaining = Math.max(0, start - (now ?? start));
  const parts = [
    {value: Math.floor(remaining / 86_400_000), label: t("home.days")},
    {value: Math.floor((remaining / 3_600_000) % 24), label: t("home.hours")},
    {value: Math.floor((remaining / 60_000) % 60), label: t("home.minutes")},
    {value: Math.floor((remaining / 1000) % 60), label: t("home.seconds")},
  ];

  return (
    <div className="max-w-md">
      <p className={cn("mb-2.5 text-[13px] font-semibold", label)}>{heading ?? t("home.countdownLabel")}</p>
      {/* Four equal cards in one row at every phone width (min 320px). */}
      <div className="grid grid-cols-4 gap-2 sm:gap-3" role="timer" aria-live="off">
        {parts.map((part) => (
          <div
            key={part.label}
            className={cn(
              "flex min-w-0 flex-col items-center justify-center rounded-2xl py-2.5 sm:py-3",
              tone === "light" ? "bg-card shadow-[var(--shadow-card)] ring-1 ring-line" : "bg-white/10 ring-1 ring-white/15",
            )}
          >
            <span className={cn("tabular block text-[1.625rem] leading-none font-bold sm:text-3xl", tone === "light" ? "text-ink" : "text-white")} suppressHydrationWarning>
              {now === null ? "–" : formatNumber(locale, part.value).padStart(2, locale === "ar" ? "٠" : "0")}
            </span>
            <span className={cn("mt-1.5 block text-xs font-medium", label)}>{part.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
