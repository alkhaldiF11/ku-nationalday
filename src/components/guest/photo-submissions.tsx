"use client";

import {CheckCircle2, Clock3, Trash2, XCircle} from "lucide-react";
import {useEffect, useState} from "react";

import {consumeReviewNotices, withdrawGuestPhoto} from "@/app/actions/photos";
import {useErrorMessage} from "@/components/forms/use-action-form";
import {Badge} from "@/components/ui/card";
import {ConfirmButton} from "@/components/ui/dialog";
import {FormAlert} from "@/components/ui/field";
import {useToast} from "@/components/ui/toast";
import type {PhotoStatus} from "@/lib/data/photos";
import {useI18n} from "@/lib/i18n/client";
import {formatDateTime} from "@/lib/i18n/core";

export type OwnSubmission = {
  id: string;
  src: string;
  title: string | null;
  caption: string | null;
  status: PhotoStatus;
  rejectionReason: string | null;
  createdAt: string;
};

const STATUS_TONE = {pending: "gold", approved: "success", rejected: "danger"} as const;
const STATUS_ICON = {pending: Clock3, approved: CheckCircle2, rejected: XCircle};

export function StatusBadge({status}: {status: PhotoStatus}) {
  const {t} = useI18n();
  const Icon = STATUS_ICON[status];
  return (
    <Badge tone={STATUS_TONE[status]}>
      <Icon className="size-3" aria-hidden />
      {t(`photos.status.${status}`)}
    </Badge>
  );
}

/** One-time notices for photos reviewed since the guest last looked. */
export function ReviewNotices() {
  const {t} = useI18n();
  const [notices, setNotices] = useState<{approved: number; rejected: number} | null>(null);

  useEffect(() => {
    let active = true;
    void consumeReviewNotices().then((result) => {
      if (active && result.ok) setNotices(result.data);
    });
    return () => {
      active = false;
    };
  }, []);

  if (!notices || (!notices.approved && !notices.rejected)) return null;
  return (
    <div className="space-y-2" aria-live="polite">
      {notices.approved ? (
        <FormAlert tone="success">{notices.approved === 1 ? t("photos.approvedNotice") : t("photos.approvedNoticeMany", {count: notices.approved})}</FormAlert>
      ) : null}
      {notices.rejected ? <FormAlert>{notices.rejected === 1 ? t("photos.rejectedNotice") : t("photos.rejectedNoticeMany", {count: notices.rejected})}</FormAlert> : null}
    </div>
  );
}

export function SubmissionList({submissions}: {submissions: OwnSubmission[]}) {
  const {t, locale} = useI18n();
  const toast = useToast();
  const errorMessage = useErrorMessage();

  if (!submissions.length) {
    return <p className="rounded-2xl border border-dashed border-line-strong bg-paper px-4 py-8 text-center text-muted">{t("photos.empty")}</p>;
  }

  return (
    <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {submissions.map((item) => (
        <li key={item.id} className="flex flex-col overflow-hidden rounded-2xl bg-card ring-1 ring-line shadow-[var(--shadow-card)]">
          <a href={item.src} target="_blank" rel="noreferrer" className="relative block aspect-[4/3] bg-paper-deep">
            {/* eslint-disable-next-line @next/next/no-img-element -- access-checked private image */}
            <img src={item.src} alt={item.title ?? ""} loading="lazy" width={400} height={300} className="absolute inset-0 size-full object-cover" />
            <span className="absolute top-2 start-2">
              <StatusBadge status={item.status} />
            </span>
          </a>
          <div className="flex flex-1 flex-col p-4">
            <p className="font-semibold" dir="auto">
              {item.title || t("photos.untitled")}
            </p>
            {item.caption ? (
              <p className="mt-0.5 text-sm text-ink-soft" dir="auto">
                {item.caption}
              </p>
            ) : null}
            <p className="mt-2 text-xs text-muted">{t("photos.uploadedAt", {time: formatDateTime(locale, item.createdAt)})}</p>
            {item.status === "rejected" && item.rejectionReason ? (
              <p className="mt-3 rounded-xl bg-danger-wash px-3 py-2 text-sm text-danger" dir="auto">
                {t("photos.reason", {reason: item.rejectionReason})}
              </p>
            ) : null}
            {item.status === "pending" ? (
              <div className="mt-auto pt-3">
                <ConfirmButton
                  message={t("photos.withdrawConfirm")}
                  onConfirm={async () => {
                    const result = await withdrawGuestPhoto(item.id);
                    if (result.ok) toast("success", t("photos.withdrawn"));
                    else toast("error", errorMessage(result));
                  }}
                >
                  <Trash2 className="size-4" aria-hidden />
                  {t("common.delete")}
                </ConfirmButton>
              </div>
            ) : null}
          </div>
        </li>
      ))}
    </ul>
  );
}
