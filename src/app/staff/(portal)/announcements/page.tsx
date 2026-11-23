import {AnnouncementEditor, DeleteAnnouncement} from "@/components/staff/admin/content-admin";
import {Badge, Card, EmptyState, PageHeader} from "@/components/ui/card";
import {requireStaffPage} from "@/lib/auth/guards";
import {listAnnouncements} from "@/lib/data/content";
import {formatDateTime} from "@/lib/i18n/core";
import {getI18n} from "@/lib/i18n/server";

export default async function AnnouncementsAdminPage() {
  await requireStaffPage(["admin"]);
  const {t, locale} = await getI18n();
  const announcements = await listAnnouncements({publishedOnly: false, limit: 200});

  return (
    <div className="max-w-4xl">
      <PageHeader eyebrow={t("staff.sections.manage")} title={t("staff.announcements.title")} description={t("staff.announcements.lede")} action={<AnnouncementEditor />} />
      {announcements.length ? (
        <div className="space-y-3">
          {announcements.map((item) => (
            <Card key={item.id} className="flex flex-wrap items-start gap-4">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="font-bold" dir="auto">{item.title}</h2>
                  {item.isPublished ? <Badge tone="success">{t("common.published")}</Badge> : <Badge>{t("common.draft")}</Badge>}
                </div>
                <p className="mt-1 text-sm leading-relaxed whitespace-pre-line text-ink-soft" dir="auto">{item.body}</p>
                <p className="mt-2 text-xs text-muted">
                  {item.createdBy} · {formatDateTime(locale, item.createdAt)}
                </p>
              </div>
              <div className="flex gap-1">
                <AnnouncementEditor announcement={item} />
                <DeleteAnnouncement announcement={item} />
              </div>
            </Card>
          ))}
        </div>
      ) : (
        <EmptyState title={t("staff.announcements.empty")} />
      )}
    </div>
  );
}
