import {Coffee, Drum, Flag, Gamepad2, MapPin, Music, Sparkles, UtensilsCrossed} from "lucide-react";

import {Badge} from "@/components/ui/card";
import {localizeActivity, type Activity, type ActivityCategory} from "@/lib/data/content";
import {activityStatus, currentTime, isOngoing} from "@/lib/event-time";
import {formatClock, formatDay, type Locale} from "@/lib/i18n/core";
import {getI18n} from "@/lib/i18n/server";
import {cn} from "@/lib/utils/cn";

export const CATEGORY_ICON: Record<ActivityCategory, typeof Flag> = {
  welcome: Coffee,
  ceremony: Flag,
  music: Music,
  culture: Drum,
  food: UtensilsCrossed,
  games: Gamepad2,
  general: Sparkles,
};

type Status = "past" | "now" | "upcoming";

/**
 * Event programme in the style of the printed posters: a red timeline of stage
 * segments with stacked start/end times and bilingual titles, followed by the
 * attractions that run all evening (food trucks, carnival games).
 */
export async function ProgrammeList({activities, compact = false}: {activities: Activity[]; compact?: boolean}) {
  const {t, locale} = await getI18n();
  const now = currentTime();
  const days = Map.groupBy(activities, (item) => item.date);

  return (
    <div className="space-y-10">
      {[...days.entries()].map(([date, items]) => {
        const stage = items.filter((item) => !isOngoing(item));
        const ongoing = items.filter(isOngoing);
        return (
          <section key={date}>
            {days.size > 1 || !compact ? <h3 className="mb-5 text-sm font-bold tracking-wide text-muted uppercase">{formatDay(locale, date)}</h3> : null}

            {stage.length ? (
              <ol className="relative">
                {/* Timeline spine, centred on the dots: time column + gap + half the dot - half the line. */}
                <span className="absolute inset-y-5 start-[6.375rem] w-0.5 rounded-full bg-crimson/25 sm:start-[7.875rem]" aria-hidden />
                {stage.map((activity) => (
                  <StageItem key={activity.id} activity={activity} status={activityStatus(activity, now)} locale={locale} compact={compact} nowLabel={t("programme.now")} />
                ))}
              </ol>
            ) : null}

            {ongoing.length ? (
              <div className={cn(stage.length && "mt-8")}>
                <h4 className="mb-3 flex items-center gap-3 text-xs font-bold tracking-[0.14em] text-crimson uppercase">
                  {t("programme.ongoing")}
                  <span className="h-px flex-1 bg-crimson/25" aria-hidden />
                </h4>
                <ul className="grid gap-3 sm:grid-cols-2">
                  {ongoing.map((activity) => (
                    <OngoingItem key={activity.id} activity={activity} status={activityStatus(activity, now)} locale={locale} nowLabel={t("programme.now")} />
                  ))}
                </ul>
              </div>
            ) : null}
          </section>
        );
      })}
    </div>
  );
}

function Times({activity, locale, className}: {activity: Activity; locale: Locale; className?: string}) {
  return (
    <p className={cn("tabular shrink-0 leading-tight font-bold", className)}>
      <span className="block text-ink">{formatClock(locale, activity.startTime)}</span>
      <span className="block text-muted">{formatClock(locale, activity.endTime)}</span>
    </p>
  );
}

function StageItem({activity, status, locale, compact, nowLabel}: {activity: Activity; status: Status; locale: Locale; compact: boolean; nowLabel: string}) {
  const text = localizeActivity(activity, locale);
  const Icon = CATEGORY_ICON[activity.category];
  return (
    <li className={cn("relative flex items-start gap-4 py-2.5 sm:gap-6", status === "past" && "opacity-50")}>
      <Times activity={activity} locale={locale} className="w-20 pt-3 text-end text-[15px] sm:w-24" />
      <span
        className={cn("relative z-10 mt-[1.15rem] size-3.5 shrink-0 rounded-full ring-4 ring-paper", status === "now" ? "bg-crimson" : "bg-crimson/70")}
        aria-hidden
      >
        {status === "now" ? <span className="absolute inset-0 animate-ping rounded-full bg-crimson" /> : null}
      </span>
      <article className={cn("min-w-0 flex-1 rounded-2xl bg-card px-4 py-3 ring-1 ring-line", status === "now" && "shadow-[var(--shadow-lift)] ring-2 ring-crimson")}>
        <div className="flex flex-wrap items-center gap-2">
          <h4 className="text-[17px] leading-snug font-bold text-ink">{text.title}</h4>
          {status === "now" ? <Badge tone="crimson">{nowLabel}</Badge> : null}
        </div>
        {text.alt ? <p className="text-sm font-semibold text-crimson-deep/80">{text.alt}</p> : null}
        <p className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted">
          <span className="inline-flex items-center gap-1.5">
            <Icon className="size-3.5" aria-hidden />
            {text.location}
          </span>
        </p>
        {!compact && text.description ? <p className="mt-2 text-sm leading-relaxed text-ink-soft">{text.description}</p> : null}
      </article>
    </li>
  );
}

function OngoingItem({activity, status, locale, nowLabel}: {activity: Activity; status: Status; locale: Locale; nowLabel: string}) {
  const text = localizeActivity(activity, locale);
  const Icon = CATEGORY_ICON[activity.category];
  return (
    <li className={cn("flex items-center gap-4 rounded-2xl bg-crimson-wash/60 px-4 py-3 ring-1 ring-crimson/15", status === "past" && "opacity-50")}>
      <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-crimson text-white">
        <Icon className="size-5" aria-hidden />
      </span>
      <div className="min-w-0 flex-1">
        <p className="flex flex-wrap items-center gap-2 font-bold text-crimson-deep">
          {text.title}
          {status === "now" ? <Badge tone="crimson">{nowLabel}</Badge> : null}
        </p>
        {text.alt ? <p className="text-sm font-semibold text-crimson-deep/70">{text.alt}</p> : null}
        <p className="mt-0.5 inline-flex items-center gap-1.5 text-xs text-muted">
          <MapPin className="size-3" aria-hidden />
          {text.location}
        </p>
      </div>
      <p className="tabular shrink-0 text-sm font-bold text-crimson-deep">
        {formatClock(locale, activity.startTime)} – {formatClock(locale, activity.endTime)}
      </p>
    </li>
  );
}
