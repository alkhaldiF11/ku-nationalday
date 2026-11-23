"use server";

import {refresh} from "next/cache";
import {z} from "zod";
import {redirect} from "next/navigation";

import {requireStaff} from "@/lib/auth/guards";
import {
  addGalleryImage,
  createAlbum,
  deleteAlbum,
  deleteActivity,
  deleteAnnouncement,
  deleteGalleryImage,
  saveActivity,
  saveAnnouncement,
  saveSettings,
  updateGalleryImage,
} from "@/lib/data/content";
import {createGuest, deleteGuest, resetGuestPassword, setGuestActive, updateGuest} from "@/lib/data/guests";
import {createStaff, setStaffPassword, staffActor, updateStaff} from "@/lib/data/staff";
import {parse, runAction} from "@/lib/actions";
import {AppError} from "@/lib/errors";
import {
  activitySchema,
  announcementSchema,
  deskRegisterSchema,
  galleryMetaSchema,
  guestEditSchema,
  settingsSchema,
  staffCreateSchema,
  staffPasswordSchema,
  staffUpdateSchema,
} from "@/lib/validation";

async function admin() {
  return staffActor(await requireStaff(["admin"]));
}

function id(value: unknown) {
  if (typeof value !== "string" || !/^[0-9a-f-]{36}$/i.test(value)) {
    throw new AppError("notFound");
  }
  return value;
}

/* Guests */

export async function adminCreateGuest(_prev: unknown, formData: FormData) {
  return runAction(async () => {
    const actor = await admin();
    const input = parse(deskRegisterSchema, formData);
    const {guest, temporaryPassword} = await createGuest({...input, source: "admin"}, actor);
    refresh();
    return {id: guest.id, code: guest.code, fullName: guest.fullName, temporaryPassword: temporaryPassword!};
  });
}

export async function adminUpdateGuest(_prev: unknown, formData: FormData) {
  return runAction(async () => {
    const actor = await admin();
    await updateGuest(id(formData.get("id")), parse(guestEditSchema, formData), actor);
    refresh();
  });
}

export async function adminSetGuestActive(guestId: string, active: boolean) {
  return runAction(async () => {
    await setGuestActive(id(guestId), active, await admin());
    refresh();
  });
}

export async function adminResetGuestPassword(guestId: string) {
  return runAction(async () => await resetGuestPassword(id(guestId), await admin()));
}

export async function adminDeleteGuest(guestId: string) {
  const result = await runAction(async () => await deleteGuest(id(guestId), await admin()));
  if (result.ok) {
    redirect("/staff/guests");
  }
  return result;
}

/* Programme */

export async function adminSaveActivity(_prev: unknown, formData: FormData) {
  return runAction(async () => {
    await saveActivity(parse(activitySchema, formData), await admin());
    refresh();
  });
}

export async function adminDeleteActivity(activityId: string) {
  return runAction(async () => {
    await deleteActivity(id(activityId), await admin());
    refresh();
  });
}

/* Announcements */

export async function adminSaveAnnouncement(_prev: unknown, formData: FormData) {
  return runAction(async () => {
    await saveAnnouncement(parse(announcementSchema, formData), await admin());
    refresh();
  });
}

export async function adminDeleteAnnouncement(announcementId: string) {
  return runAction(async () => {
    await deleteAnnouncement(id(announcementId), await admin());
    refresh();
  });
}

/* Gallery */

export async function adminUploadImage(_prev: unknown, formData: FormData) {
  return runAction(async () => {
    const actor = await admin();
    const meta = parse(galleryMetaSchema, formData);
    const file = formData.get("file");
    if (!(file instanceof File) || file.size === 0) {
      throw new AppError("invalidImage");
    }
    await addGalleryImage({...meta, bytes: new Uint8Array(await file.arrayBuffer())}, actor);
    // Bulk uploads send one photo per request and refresh once at the end (adminFinishUploads).
    if (formData.get("deferRefresh") !== "1") refresh();
  });
}

/** Called once after a bulk upload, so the page re-renders a single time instead of per photo. */
export async function adminFinishUploads() {
  return runAction(async () => {
    await admin();
    refresh();
  });
}

export async function adminUpdateImage(_prev: unknown, formData: FormData) {
  return runAction(async () => {
    await updateGalleryImage(id(formData.get("id")), parse(galleryMetaSchema, formData), await admin());
    refresh();
  });
}

export async function adminDeleteImage(imageId: string) {
  return runAction(async () => {
    await deleteGalleryImage(id(imageId), await admin());
    refresh();
  });
}

/* Staff accounts */

export async function adminCreateStaff(_prev: unknown, formData: FormData) {
  return runAction(async () => {
    await createStaff(parse(staffCreateSchema, formData), await admin());
    refresh();
  });
}

export async function adminUpdateStaff(_prev: unknown, formData: FormData) {
  return runAction(async () => {
    const input = parse(staffUpdateSchema, formData);
    await updateStaff(input.id, input, await admin());
    refresh();
  });
}

export async function adminSetStaffPassword(_prev: unknown, formData: FormData) {
  return runAction(async () => {
    const input = parse(staffPasswordSchema, formData);
    await setStaffPassword(input.id, input.password, await admin());
  });
}

/* Settings */

export async function adminSaveSettings(_prev: unknown, formData: FormData) {
  return runAction(async () => {
    await saveSettings(parse(settingsSchema, formData), await admin());
    refresh();
  });
}

/* Gallery albums (yearly folders) */

const albumYear = z.coerce.number({error: "validation.number"}).int("validation.number").min(2000, "validation.min").max(2100, "validation.max");

export async function adminCreateAlbum(_prev: unknown, formData: FormData) {
  return runAction(async () => {
    const {year} = parse(z.object({year: albumYear}), formData);
    await createAlbum(year, await admin());
    refresh();
  });
}

export async function adminDeleteAlbum(year: number) {
  return runAction(async () => {
    await deleteAlbum(albumYear.parse(year), await admin());
    refresh();
  });
}
