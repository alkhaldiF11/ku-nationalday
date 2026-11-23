import {MapPin} from "lucide-react";

import {ActivityEditor, DeleteActivity} from "@/components/staff/admin/content-admin";
import {CATEGORY_ICON} from "@/components/site/programme-list";
import {Badge, Card, EmptyState, PageHeader} from "@/components/ui/card";
import {requireStaffPage} from "@/lib/auth/guards";
import {getSettings, listActivities} from "@/lib/data/content";
import {formatClock, formatDay} from "@/lib/i18n/core";
import {getI18n} from "@/lib/i18n/server";
import {cn} from "@/lib/utils/cn";

export default async function ProgrammeAdminPage() {
  await requireStaffPage(["admin"]);
  const {t, locale} = await getI18n();
  const activities = await listActivities({activeOnly: false});
  const {eventDate} = await getSettings();
  const days = Map.groupBy(activities, (activity) => activity.date);

  return (
    <div className="max-w-5xl">
      <PageHeader eyebrow={t("staff.sections.manage")} title={t("staff.programme.title")} description={t("staff.programme.lede")} action={<ActivityEditor defaultDate={eventDate} />} />
      {activities.length ? (
        <div className="space-y-8">
          {[...days.entries()].map(([date, items]) => (
            <section key={date}>
              <h2 className="mb-3 text-sm font-bold tracking-wide text-muted uppercase">{formatDay(locale, date)}</h2>
              <Card className="divide-y divide-line p-0 sm:p-0">
                {items.map((activity) => {
                  const Icon = CATEGORY_ICON[activity.category];
                  return (
                    <div key={activity.id} className={cn("grid grid-cols-[1fr_auto] items-start gap-x-3 gap-y-1 px-4 py-4 sm:flex sm:flex-wrap sm:items-center sm:gap-4 sm:px-5", !activity.isActive && "opacity-55")}>
                      <span className="tabular col-span-2 text-sm font-bold text-crimson-deep sm:w-32 sm:shrink-0 sm:text-ink">
                        {formatClock(locale, activity.startTime)} – {formatClock(locale, activity.endTime)}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="flex flex-wrap items-center gap-2 font-semibold">
                          {activity.title}
                          {!activity.isActive ? <Badge>{t("staff.programme.hidden")}</Badge> : null}
                          {!activity.titleAr ? <Badge tone="gold">{t("staff.programme.missingArabic")}</Badge> : null}
                        </p>
                        {activity.titleAr ? (
                          <p className="text-sm font-semibold text-ink-soft" dir="rtl" lang="ar">
                            {activity.titleAr}
                          </p>
                        ) : null}
                        <p className="mt-0.5 flex flex-wrap gap-x-4 text-sm text-muted">
                          <span className="inline-flex items-center gap-1.5">
                            <MapPin className="size-3.5" aria-hidden />
                            {activity.location}
                          </span>
                          <span className="inline-flex items-center gap-1.5">
                            <Icon className="size-3.5" aria-hidden />
                            {t(`categories.${activity.category}`)}
                          </span>
                        </p>
                      </div>
                      <div className="col-start-2 row-start-2 flex gap-1 sm:col-auto sm:row-auto">
                        <ActivityEditor activity={activity} defaultDate={eventDate} />
                        <DeleteActivity activity={activity} />
                      </div>
                    </div>
                  );
                })}
              </Card>
            </section>
          ))}
        </div>
      ) : (
        <EmptyState title={t("staff.programme.empty")} />
      )}
    </div>
  );
}
