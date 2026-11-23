"use server";

import {refresh} from "next/cache";
import {z} from "zod";

import {requireGuest, requireStaff} from "@/lib/auth/guards";
import {approveSubmission, deleteOwnPendingSubmission, deleteSubmission, rejectSubmission, submitPhoto, takeReviewNotifications} from "@/lib/data/photos";
import {staffActor} from "@/lib/data/staff";
import {parse, runAction} from "@/lib/actions";
import {AppError} from "@/lib/errors";

/*
 * Every action re-checks the session and role. The guest id always comes from the
 * session cookie — never from the client — so a guest can only act on their own photos.
 */

const meta = z.object({
  title: z.string().trim().max(100, "validation.tooLong").optional().transform((value) => value || null),
  caption: z.string().trim().max(300, "validation.tooLong").optional().transform((value) => value || null),
});

const submissionId = z.uuid();

/** One photo per call: the client uploads a multi-photo selection one file at a time. */
export async function uploadGuestPhoto(formData: FormData) {
  return runAction(async () => {
    const guest = await requireGuest();
    const {title, caption} = parse(meta, {title: formData.get("title") ?? undefined, caption: formData.get("caption") ?? undefined});
    const file = formData.get("file");
    if (!(file instanceof File)) {
      throw new AppError("invalidImage");
    }
    const submission = await submitPhoto(
      {guestId: guest.id, bytes: new Uint8Array(await file.arrayBuffer()), title, caption},
      {type: "guest", id: guest.id, name: guest.fullName},
    );
    return {id: submission.id};
  });
}

export async function finishGuestUpload() {
  await requireGuest();
  refresh();
}

export async function withdrawGuestPhoto(id: string) {
  return runAction(async () => {
    const guest = await requireGuest();
    await deleteOwnPendingSubmission(guest.id, submissionId.parse(id), {type: "guest", id: guest.id, name: guest.fullName});
    refresh();
  });
}

/** Returns (and clears) the "your photo was approved / not approved" notices for the signed-in guest. */
export async function consumeReviewNotices() {
  return runAction(async () => {
    const guest = await requireGuest();
    return await takeReviewNotifications(guest.id);
  });
}

export async function approvePhoto(id: string) {
  return runAction(async () => {
    const staff = await requireStaff(["admin"]);
    await approveSubmission(submissionId.parse(id), staffActor(staff));
    refresh();
  });
}

export async function rejectPhoto(id: string, reason: string) {
  return runAction(async () => {
    const staff = await requireStaff(["admin"]);
    const cleaned = z.string().trim().max(300, "validation.tooLong").parse(reason ?? "");
    await rejectSubmission(submissionId.parse(id), cleaned || null, staffActor(staff));
    refresh();
  });
}

export async function deletePhoto(id: string) {
  return runAction(async () => {
    const staff = await requireStaff(["admin"]);
    await deleteSubmission(submissionId.parse(id), staffActor(staff));
    refresh();
  });
}
