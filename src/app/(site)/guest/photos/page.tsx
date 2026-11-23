import type {Metadata} from "next";
import {Images} from "lucide-react";

import {PhotoUploader} from "@/components/guest/photo-uploader";
import {ReviewNotices, SubmissionList} from "@/components/guest/photo-submissions";
import {ButtonLink} from "@/components/ui/button";
import {CardHeader, PageHeader} from "@/components/ui/card";
import {requireGuestPage} from "@/lib/auth/guards";
import {listGuestSubmissions} from "@/lib/data/photos";
import {getI18n} from "@/lib/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  const {t} = await getI18n();
  return {title: t("photos.pageTitle")};
}

export default async function GuestPhotosPage() {
  const guest = await requireGuestPage();
  const {t} = await getI18n();
  // Scoped to the signed-in guest on the server: other guests' submissions are never queried.
  const submissions = (await listGuestSubmissions(guest.id)).map(({id, src, title, caption, status, rejectionReason, createdAt}) => ({
    id,
    src,
    title,
    caption,
    status,
    rejectionReason,
    createdAt,
  }));
  const counts = {
    pending: submissions.filter((item) => item.status === "pending").length,
    approved: submissions.filter((item) => item.status === "approved").length,
    rejected: submissions.filter((item) => item.status === "rejected").length,
  };

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow={t("nav.myPhotos")}
        title={t("photos.pageTitle")}
        description={t("photos.pageLede")}
        action={
          <ButtonLink href="/gallery" variant="secondary">
            <Images className="size-4" aria-hidden />
            {t("photos.viewGallery")}
          </ButtonLink>
        }
      />
      <ReviewNotices />
      <PhotoUploader />
      <section className="rounded-[var(--radius-card)] bg-card p-5 shadow-[var(--shadow-card)] ring-1 ring-line sm:p-6">
        <CardHeader
          title={t("photos.listTitle")}
          description={
            submissions.length
              ? `${t("photos.status.pending")}: ${counts.pending} · ${t("photos.status.approved")}: ${counts.approved} · ${t("photos.status.rejected")}: ${counts.rejected}`
              : undefined
          }
        />
        <SubmissionList submissions={submissions} />
      </section>
    </div>
  );
}
