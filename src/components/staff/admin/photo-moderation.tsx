"use client";

import Link from "next/link";
import {Check, Eye, Trash2, X} from "lucide-react";
import {useState, useTransition} from "react";

import {approvePhoto, deletePhoto, rejectPhoto} from "@/app/actions/photos";
import {useErrorMessage} from "@/components/forms/use-action-form";
import {StatusBadge} from "@/components/guest/photo-submissions";
import {Button} from "@/components/ui/button";
import {ConfirmButton, Dialog} from "@/components/ui/dialog";
import {useToast} from "@/components/ui/toast";
import type {ActionResult} from "@/lib/actions";
import type {PhotoSubmission} from "@/lib/data/photos";
import {useI18n} from "@/lib/i18n/client";
import {formatDateTime} from "@/lib/i18n/core";

export function ModerationCard({photo}: {photo: PhotoSubmission}) {
  const {t, locale} = useI18n();
  const toast = useToast();
  const errorMessage = useErrorMessage();
  const [viewing, setViewing] = useState(false);
  const [rejecting, setRejecting] = useState(false);
  const [reason, setReason] = useState("");
  const [pending, startTransition] = useTransition();

  const run = (action: () => Promise<ActionResult<unknown>>, success: string, after?: () => void) =>
    startTransition(async () => {
      const result = await action();
      if (result.ok) {
        toast("success", success);
        after?.();
      } else {
        toast("error", errorMessage(result));
      }
    });

  const title = photo.title || t("photos.untitled");

  return (
    <li className="flex flex-col overflow-hidden rounded-2xl bg-card ring-1 ring-line shadow-[var(--shadow-card)]">
      <button type="button" onClick={() => setViewing(true)} className="group relative block aspect-[4/3] bg-paper-deep" aria-label={`${t("staff.photos.view")}: ${title}`}>
        {/* eslint-disable-next-line @next/next/no-img-element -- access-checked private image */}
        <img src={photo.src} alt="" loading="lazy" width={400} height={300} className="absolute inset-0 size-full object-cover transition group-hover:scale-[1.02]" />
        <span className="absolute top-2 start-2">
          <StatusBadge status={photo.status} />
        </span>
      </button>

      <div className="flex flex-1 flex-col p-4">
        <p className="font-bold" dir="auto">
          {title}
        </p>
        {photo.caption ? (
          <p className="mt-0.5 text-sm text-ink-soft" dir="auto">
            {photo.caption}
          </p>
        ) : null}
        <dl className="mt-3 space-y-1 text-xs text-muted">
          <div className="flex gap-1">
            <dt className="font-semibold">{t("staff.photos.guest")}:</dt>
            <dd>
              <Link href={`/staff/guests/${photo.guestId}`} className="font-semibold text-ink hover:text-crimson hover:underline">
                {photo.guestName}
              </Link>{" "}
              <span className="font-mono" dir="ltr">
                {photo.guestCode}
              </span>
            </dd>
          </div>
          <div className="flex gap-1">
            <dt className="font-semibold">{t("staff.photos.uploaded")}:</dt>
            <dd>{formatDateTime(locale, photo.createdAt)}</dd>
          </div>
          {photo.reviewedAt ? <div>{t("staff.photos.reviewedBy", {name: photo.reviewedByName ?? "—", time: formatDateTime(locale, photo.reviewedAt)})}</div> : null}
        </dl>
        {photo.status === "rejected" && photo.rejectionReason ? (
          <p className="mt-2 rounded-lg bg-danger-wash px-3 py-2 text-xs text-danger" dir="auto">
            {t("photos.reason", {reason: photo.rejectionReason})}
          </p>
        ) : null}

        <div className="mt-auto flex flex-wrap gap-2 pt-4">
          <Button size="sm" variant="ghost" onClick={() => setViewing(true)}>
            <Eye className="size-4" aria-hidden />
            {t("staff.photos.view")}
          </Button>
          {photo.status !== "approved" ? (
            <Button size="sm" variant="success" pending={pending} onClick={() => run(() => approvePhoto(photo.id), t("staff.photos.approved"))}>
              <Check className="size-4" aria-hidden />
              {t("staff.photos.approve")}
            </Button>
          ) : null}
          {photo.status !== "rejected" ? (
            <Button size="sm" variant="secondary" disabled={pending} onClick={() => setRejecting(true)}>
              <X className="size-4" aria-hidden />
              {t("staff.photos.reject")}
            </Button>
          ) : null}
          <ConfirmButton message={t("staff.photos.deleteConfirm")} onConfirm={() => run(() => deletePhoto(photo.id), t("staff.photos.deleted"))}>
            <Trash2 className="size-4" aria-hidden />
            <span className="max-sm:sr-only">{t("common.delete")}</span>
          </ConfirmButton>
        </div>
      </div>

      <Dialog open={viewing} onClose={() => setViewing(false)} title={title} description={`${photo.guestName} · ${photo.guestCode}`} size="lg">
        {/* eslint-disable-next-line @next/next/no-img-element -- access-checked private image */}
        <img src={photo.src} alt={title} className="max-h-[65vh] w-full rounded-xl bg-night object-contain" />
        {photo.caption ? (
          <p className="mt-3 text-ink-soft" dir="auto">
            {photo.caption}
          </p>
        ) : null}
      </Dialog>

      <Dialog open={rejecting} onClose={() => setRejecting(false)} title={t("staff.photos.rejectTitle")} size="sm">
        <label className="block text-sm font-semibold text-ink-soft" htmlFor={`reason-${photo.id}`}>
          {t("staff.photos.reasonLabel")} <span className="font-normal text-muted">({t("common.optional")})</span>
        </label>
        <textarea
          id={`reason-${photo.id}`}
          value={reason}
          onChange={(event) => setReason(event.target.value)}
          maxLength={300}
          rows={3}
          dir="auto"
          placeholder={t("staff.photos.reasonPlaceholder")}
          className="mt-1.5 w-full rounded-xl bg-card px-3.5 py-2.5 ring-1 ring-line-strong focus:ring-2 focus:ring-crimson focus:outline-none"
        />
        <div className="mt-5 flex justify-end gap-2">
          <Button variant="secondary" onClick={() => setRejecting(false)}>
            {t("common.cancel")}
          </Button>
          <Button variant="danger" pending={pending} onClick={() => run(() => rejectPhoto(photo.id, reason), t("staff.photos.rejected"), () => setRejecting(false))}>
            {t("staff.photos.reject")}
          </Button>
        </div>
      </Dialog>
    </li>
  );
}
