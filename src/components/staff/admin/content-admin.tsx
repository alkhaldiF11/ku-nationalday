"use client";

import {Trash2} from "lucide-react";

import {
  adminCreateAlbum,
  adminDeleteActivity,
  adminDeleteAlbum,
  adminDeleteAnnouncement,
  adminDeleteImage,
  adminSaveActivity,
  adminSaveAnnouncement,
  adminUpdateImage,
} from "@/app/actions/admin";
import {useErrorMessage} from "@/components/forms/use-action-form";
import {EditorDialog} from "@/components/staff/admin/editor-dialog";
import {ConfirmButton} from "@/components/ui/dialog";
import {SelectField, TextAreaField, TextField, Toggle} from "@/components/ui/field";
import {useToast} from "@/components/ui/toast";
import type {ActionResult} from "@/lib/actions";
import type {Activity, Announcement, GalleryImage} from "@/lib/data/content";
import {useI18n} from "@/lib/i18n/client";

const CATEGORIES = ["welcome", "ceremony", "music", "culture", "food", "games", "general"] as const;

function DeleteButton({message, run, success}: {message: string; run: () => Promise<ActionResult<unknown>>; success: string}) {
  const {t} = useI18n();
  const toast = useToast();
  const errorMessage = useErrorMessage();
  return (
    <ConfirmButton
      variant="danger"
      message={message}
      onConfirm={async () => {
        const result = await run();
        if (result.ok) toast("success", success);
        else toast("error", errorMessage(result));
      }}
    >
      <Trash2 className="size-4" aria-hidden />
      <span className="max-sm:sr-only">{t("common.delete")}</span>
    </ConfirmButton>
  );
}

/* ───────────── Programme ───────────── */

export function ActivityEditor({activity, defaultDate}: {activity?: Activity; defaultDate: string}) {
  const {t} = useI18n();
  return (
    <EditorDialog
      action={adminSaveActivity}
      mode={activity ? "edit" : "add"}
      trigger={t("staff.programme.add")}
      title={activity ? t("staff.programme.editTitle") : t("staff.programme.addTitle")}
      successMessage={t("staff.programme.saved")}
      hidden={activity ? {id: activity.id} : undefined}
      itemLabel={activity?.title}
      size="lg"
      fields={(error) => (
        <>
          {/* English and Arabic side by side, like the bilingual event posters. */}
          <div className="grid gap-4 sm:grid-cols-2">
            <TextField label={t("staff.programme.titleEn")} name="title" defaultValue={activity?.title} required error={error("title")} dir="ltr" lang="en" />
            <TextField label={t("staff.programme.titleAr")} name="titleAr" defaultValue={activity?.titleAr ?? ""} optional error={error("titleAr")} dir="rtl" lang="ar" />
            <TextField label={t("staff.programme.locationEn")} name="location" defaultValue={activity?.location} required error={error("location")} dir="ltr" lang="en" />
            <TextField label={t("staff.programme.locationAr")} name="locationAr" defaultValue={activity?.locationAr ?? ""} optional error={error("locationAr")} dir="rtl" lang="ar" />
          </div>
          <div className="grid gap-4 sm:grid-cols-4">
            <SelectField label={t("staff.programme.category")} name="category" defaultValue={activity?.category ?? "general"} error={error("category")}>
              {CATEGORIES.map((category) => (
                <option key={category} value={category}>
                  {t(`categories.${category}`)}
                </option>
              ))}
            </SelectField>
            <TextField label={t("staff.programme.date")} name="date" type="date" defaultValue={activity?.date ?? defaultDate} required error={error("date")} />
            <TextField label={t("staff.programme.start")} name="startTime" type="time" defaultValue={activity?.startTime ?? "16:00"} required error={error("startTime")} />
            <TextField label={t("staff.programme.end")} name="endTime" type="time" defaultValue={activity?.endTime ?? "17:00"} required error={error("endTime")} />
          </div>
          <p className="text-xs text-muted">{t("staff.programme.ongoingHint")}</p>
          <div className="grid gap-4 sm:grid-cols-2">
            <TextAreaField label={t("staff.programme.descriptionEn")} name="description" defaultValue={activity?.description} optional error={error("description")} dir="ltr" lang="en" />
            <TextAreaField label={t("staff.programme.descriptionAr")} name="descriptionAr" defaultValue={activity?.descriptionAr ?? ""} optional error={error("descriptionAr")} dir="rtl" lang="ar" />
          </div>
          <Toggle label={t("staff.programme.visible")} name="isActive" defaultChecked={activity?.isActive ?? true} />
        </>
      )}
    />
  );
}

export function DeleteActivity({activity}: {activity: Activity}) {
  const {t} = useI18n();
  return <DeleteButton message={t("staff.programme.deleteConfirm", {title: activity.title})} run={() => adminDeleteActivity(activity.id)} success={t("staff.programme.deleted")} />;
}

/* ───────────── Announcements ───────────── */

export function AnnouncementEditor({announcement}: {announcement?: Announcement}) {
  const {t} = useI18n();
  return (
    <EditorDialog
      action={adminSaveAnnouncement}
      mode={announcement ? "edit" : "add"}
      trigger={t("staff.announcements.add")}
      title={announcement ? t("staff.announcements.editTitle") : t("staff.announcements.addTitle")}
      successMessage={t("staff.announcements.saved")}
      hidden={announcement ? {id: announcement.id} : undefined}
      itemLabel={announcement?.title}
      fields={(error) => (
        <>
          <TextField label={t("staff.announcements.itemTitle")} name="title" defaultValue={announcement?.title} required error={error("title")} />
          <TextAreaField label={t("staff.announcements.body")} name="body" defaultValue={announcement?.body} rows={5} required error={error("body")} />
          <Toggle label={t("staff.announcements.publish")} name="isPublished" defaultChecked={announcement?.isPublished ?? true} />
        </>
      )}
    />
  );
}

export function DeleteAnnouncement({announcement}: {announcement: Announcement}) {
  const {t} = useI18n();
  return (
    <DeleteButton message={t("staff.announcements.deleteConfirm", {title: announcement.title})} run={() => adminDeleteAnnouncement(announcement.id)} success={t("staff.announcements.deleted")} />
  );
}

/* ───────────── Gallery ───────────── */

export function ImageEditor({image, albums}: {image: GalleryImage; albums: number[]}) {
  const {t} = useI18n();
  return (
    <EditorDialog
      action={adminUpdateImage}
      mode="edit"
      trigger={t("common.edit")}
      title={t("common.edit")}
      successMessage={t("staff.gallery.saved")}
      hidden={{id: image.id}}
      itemLabel={image.title}
      fields={(error) => (
        <>
          <div className="grid gap-4 sm:grid-cols-[1fr_9rem]">
            <TextField label={t("staff.gallery.photoTitle")} name="title" defaultValue={image.title} required error={error("title")} />
            <AlbumSelect albums={albums} defaultValue={image.albumYear} error={error("albumYear")} />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <TextField label={t("staff.gallery.category")} name="category" defaultValue={image.category} required error={error("category")} />
            <TextField label={t("staff.gallery.caption")} name="caption" defaultValue={image.caption ?? ""} optional error={error("caption")} />
          </div>
        </>
      )}
    />
  );
}

function AlbumSelect({albums, defaultValue, error}: {albums: number[]; defaultValue: number; error?: string}) {
  const {t} = useI18n();
  return (
    <SelectField label={t("staff.gallery.album")} name="albumYear" defaultValue={String(defaultValue)} error={error}>
      {albums.map((year) => (
        <option key={year} value={year}>
          {t("gallery.yearAlbum", {year})}
        </option>
      ))}
    </SelectField>
  );
}

export function AlbumCreator({suggestedYear}: {suggestedYear: number}) {
  const {t} = useI18n();
  return (
    <EditorDialog
      action={adminCreateAlbum}
      mode="add"
      trigger={t("staff.gallery.newAlbum")}
      title={t("staff.gallery.newAlbum")}
      successMessage={t("staff.gallery.albumCreated")}
      size="sm"
      fields={(error) => (
        <TextField label={t("staff.gallery.albumYearLabel")} name="year" type="number" min={2000} max={2100} defaultValue={suggestedYear} required error={error("year")} hint={t("staff.gallery.newAlbumHint")} />
      )}
    />
  );
}

export function DeleteAlbum({year}: {year: number}) {
  const {t} = useI18n();
  return (
    <DeleteButton
      message={t("staff.gallery.deleteAlbumConfirm", {year})}
      run={() => adminDeleteAlbum(year)}
      success={t("staff.gallery.albumDeleted")}
    />
  );
}

export function DeleteImage({image}: {image: GalleryImage}) {
  const {t} = useI18n();
  return <DeleteButton message={t("staff.gallery.deleteConfirm", {title: image.title})} run={() => adminDeleteImage(image.id)} success={t("staff.gallery.deleted")} />;
}
