import Link from "next/link";

import {ModerationCard} from "@/components/staff/admin/photo-moderation";
import {EmptyState, PageHeader} from "@/components/ui/card";
import {requireStaffPage} from "@/lib/auth/guards";
import {countSubmissionsByStatus, listSubmissions, PHOTO_STATUSES, type PhotoStatus} from "@/lib/data/photos";
import {formatNumber} from "@/lib/i18n/core";
import {getI18n} from "@/lib/i18n/server";
import {cn} from "@/lib/utils/cn";

export default async function PhotoApprovalPage({searchParams}: PageProps<"/staff/photos">) {
  await requireStaffPage(["admin"]);
  const {t, locale} = await getI18n();
  const {status: raw} = await searchParams;
  const status: PhotoStatus = PHOTO_STATUSES.find((item) => item === raw) ?? "pending";
  const counts = await countSubmissionsByStatus();
  const photos = await listSubmissions(status);

  return (
    <div>
      <PageHeader eyebrow={t("staff.sections.manage")} title={t("staff.photos.title")} description={t("staff.photos.lede")} />

      <nav className="mb-6 flex flex-wrap gap-2" aria-label={t("common.filter")}>
        {PHOTO_STATUSES.map((item) => (
          <Link
            key={item}
            href={`/staff/photos?status=${item}`}
            aria-current={item === status ? "page" : undefined}
            className={cn(
              "inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold ring-1 transition",
              item === status ? "bg-ink text-white ring-ink" : "bg-card text-ink-soft ring-line hover:ring-ink/30",
            )}
          >
            {t(`staff.photos.tabs.${item}`)}
            <span className={cn("tabular rounded-full px-2 py-0.5 text-xs", item === status ? "bg-white/15" : item === "pending" && counts.pending ? "bg-crimson text-white" : "bg-paper-deep")}>
              {formatNumber(locale, counts[item])}
            </span>
          </Link>
        ))}
      </nav>

      {photos.length ? (
        <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {photos.map((photo) => (
            <ModerationCard key={photo.id} photo={photo} />
          ))}
        </ul>
      ) : (
        <EmptyState title={t(`staff.photos.empty.${status}`)} />
      )}
    </div>
  );
}
