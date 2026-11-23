import {CheckCircle2, Clock3, Trophy} from "lucide-react";

import {WinnerAnnouncer, WithdrawWinner} from "@/components/staff/admin/winner-admin";
import {Badge, Card, CardHeader, EmptyState, PageHeader} from "@/components/ui/card";
import {requireStaffPage} from "@/lib/auth/guards";
import {listAnnouncements} from "@/lib/data/winners";
import {formatDateTime} from "@/lib/i18n/core";
import {getI18n} from "@/lib/i18n/server";

/** Winner announcements: administrators choose every winner; nothing is random or automatic here. */
export default async function WinnersPage() {
  await requireStaffPage(["admin"]);
  const {t, locale} = await getI18n();
  const announcements = await listAnnouncements();

  return (
    <div className="max-w-4xl">
      <PageHeader eyebrow={t("staff.sections.prizes")} title={t("staff.winners.title")} description={t("staff.winners.lede")} />
      <div className="space-y-5">
        <Card>
          <WinnerAnnouncer />
        </Card>

        <Card className="p-0 sm:p-0">
          <div className="p-4 pb-0 sm:p-6 sm:pb-0">
            <CardHeader title={t("staff.winners.list")} />
          </div>
          {announcements.length ? (
            <ul className="divide-y divide-line border-t border-line">
              {announcements.map((item) => (
                <li key={item.id} className="flex flex-wrap items-start gap-3 px-4 py-3.5 sm:flex-nowrap sm:px-6">
                  <Trophy className="mt-0.5 size-5 shrink-0 text-gold" aria-hidden />
                  <div className="min-w-0 flex-1">
                    <p className="font-bold" dir="auto">{item.prize}</p>
                    <p className="text-sm text-ink-soft">
                      <bdi>{item.guestName}</bdi> · <span className="font-mono text-xs" dir="ltr">{item.guestCode}</span>
                    </p>
                    {item.message ? <p className="mt-1 text-sm text-muted" dir="auto">“{item.message}”</p> : null}
                    <p className="mt-1 text-xs text-muted">
                      {formatDateTime(locale, item.announcedAt)} · {item.announcedByName}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    {item.seenAt ? (
                      <Badge tone="success">
                        <CheckCircle2 className="size-3" aria-hidden />
                        {t("staff.winners.seen")}
                      </Badge>
                    ) : (
                      <Badge tone="gold">
                        <Clock3 className="size-3" aria-hidden />
                        {t("staff.winners.notSeen")}
                      </Badge>
                    )}
                    <WithdrawWinner id={item.id} name={item.guestName} prize={item.prize} />
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <div className="p-4 sm:p-6">
              <EmptyState title={t("staff.winners.empty")} />
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
