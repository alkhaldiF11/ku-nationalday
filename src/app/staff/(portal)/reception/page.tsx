import {ReceptionDesk} from "@/components/staff/reception-desk";
import {Badge, Card, CardHeader, EmptyState, PageHeader} from "@/components/ui/card";
import {DESK_ACCESS, requireStaffPage} from "@/lib/auth/guards";
import {listGuests} from "@/lib/data/guests";
import {relativeTime} from "@/lib/i18n/core";
import {getI18n} from "@/lib/i18n/server";

export default async function ReceptionPage() {
  await requireStaffPage(DESK_ACCESS.reception);
  const {t, locale} = await getI18n();
  const {guests} = await listGuests({limit: 8});

  return (
    <div>
      <PageHeader eyebrow={t("staff.sections.desks")} title={t("staff.reception.title")} description={t("staff.reception.lede")} />
      <ReceptionDesk />
      <Card className="mt-6">
        <CardHeader title={t("staff.reception.recentTitle")} />
        {guests.length ? (
          <ul className="divide-y divide-line">
            {guests.map((guest) => (
              <li key={guest.id} className="flex flex-wrap items-center justify-between gap-3 py-3 first:pt-0 last:pb-0">
                <div className="min-w-0">
                  <p className="truncate font-semibold">{guest.fullName}</p>
                  <p className="font-mono text-xs text-muted" dir="ltr">
                    {guest.code} · {guest.phone}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {guest.checkedInAt ? <Badge tone="success">{t("guest.checkedIn")}</Badge> : <Badge>{t("staff.guests.notCheckedIn")}</Badge>}
                  <span className="text-xs text-muted">{relativeTime(locale, guest.createdAt)}</span>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <EmptyState title={t("staff.reception.noRecent")} />
        )}
      </Card>
    </div>
  );
}
