import fs from "node:fs";
import path from "node:path";

import {beforeEach, describe, expect, it} from "vitest";

import {SYSTEM_ACTOR} from "@/lib/data/audit";
import {deleteGuest, getGuestByCode} from "@/lib/data/guests";
import {
  approveSubmission,
  countSubmissionsByStatus,
  deleteOwnPendingSubmission,
  listApprovedGuestPhotos,
  listGuestSubmissions,
  MAX_PENDING_PER_GUEST,
  readPhotoForViewer,
  rejectSubmission,
  submitPhoto,
  takeReviewNotifications,
} from "@/lib/data/photos";
import {resetDb, resolveDataDir} from "@/lib/db";
import {AppError} from "@/lib/errors";
const submissionsDir = () => path.join(resolveDataDir(), "private", "submissions");

const PNG = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8DwHwAFBQIAX8jx0gAAAABJRU5ErkJggg==", "base64");
const admin = {type: "staff" as const, id: null, name: "Admin"};

async function expectAppError(fn: () => unknown, key: string) {
  try {
    await fn();
  } catch (error) {
    expect(error).toBeInstanceOf(AppError);
    expect((error as AppError).key).toBe(key);
    return;
  }
  throw new Error(`Expected AppError(${key})`);
}

let fatima: string;
let yousef: string;
const asGuest = (id: string) => ({type: "guest" as const, id, name: "Guest"});
const upload = (guestId: string, title?: string) => submitPhoto({guestId, bytes: new Uint8Array(PNG), title}, asGuest(guestId));

beforeEach(async () => {
  await resetDb();
  fatima = (await getGuestByCode("G-1001"))!.id;
  yousef = (await getGuestByCode("G-1002"))!.id;
});

describe("guest photo submissions", () => {
  it("are stored privately as pending and never listed publicly until approved", async () => {
    const photo = await upload(fatima, "Fireworks");
    expect(photo.status).toBe("pending");
    expect(fs.existsSync(path.join(submissionsDir(), `${photo.id}.png`))).toBe(true);
    expect(await listApprovedGuestPhotos()).toHaveLength(0);

    // Access: owner and admin yes; anonymous visitors and other guests get nothing.
    expect(await readPhotoForViewer(photo.id, {guestId: fatima, isAdmin: false})).not.toBeNull();
    expect(await readPhotoForViewer(photo.id, {guestId: null, isAdmin: true})).not.toBeNull();
    expect(await readPhotoForViewer(photo.id, {guestId: null, isAdmin: false})).toBeNull();
    expect(await readPhotoForViewer(photo.id, {guestId: yousef, isAdmin: false})).toBeNull();

    await approveSubmission(photo.id, admin);
    expect((await listApprovedGuestPhotos()).map((item) => item.title)).toEqual(["Fireworks"]);
    // Public data is anonymous: no name or Guest ID anywhere in what visitors receive.
    const published = JSON.stringify(await listApprovedGuestPhotos());
    expect(published).not.toMatch(/Fatima|Khalifa|G-1001/);
    expect(published).not.toContain(fatima);
    expect((await readPhotoForViewer(photo.id, {guestId: null, isAdmin: false}))?.isPublic).toBe(true);
  });

  it("rejected photos stay hidden and keep the reason for the owner", async () => {
    const photo = await upload(fatima);
    await rejectSubmission(photo.id, "  Blurry  ", admin);
    expect(await listApprovedGuestPhotos()).toHaveLength(0);
    expect(await readPhotoForViewer(photo.id, {guestId: null, isAdmin: false})).toBeNull();
    expect(await readPhotoForViewer(photo.id, {guestId: yousef, isAdmin: false})).toBeNull();
    expect((await listGuestSubmissions(fatima))[0]).toMatchObject({status: "rejected", rejectionReason: "Blurry"});
    // Re-approving clears the reason.
    await approveSubmission(photo.id, admin);
    expect((await listGuestSubmissions(fatima))[0]).toMatchObject({status: "approved", rejectionReason: null});
  });

  it("guests only see and delete their own pending submissions", async () => {
    const mine = await upload(fatima);
    const theirs = await upload(yousef);
    expect((await listGuestSubmissions(fatima)).map((item) => item.id)).toEqual([mine.id]);

    await expectAppError(() => deleteOwnPendingSubmission(fatima, theirs.id, asGuest(fatima)), "notFound");
    await approveSubmission(mine.id, admin);
    await expectAppError(() => deleteOwnPendingSubmission(fatima, mine.id, asGuest(fatima)), "photoNotPending");

    await deleteOwnPendingSubmission(yousef, theirs.id, asGuest(yousef));
    expect(await listGuestSubmissions(yousef)).toHaveLength(0);
    expect(fs.existsSync(path.join(submissionsDir(), `${theirs.id}.png`))).toBe(false);
  });

  it("rejects non-images by content and caps the pending queue per guest", async () => {
    await expectAppError(() => submitPhoto({guestId: fatima, bytes: new TextEncoder().encode("<script>alert(1)</script>")}, asGuest(fatima)), "invalidImage");
    for (let index = 0; index < MAX_PENDING_PER_GUEST; index += 1) await upload(fatima);
    await expectAppError(() => upload(fatima), "tooManyPending");
    expect((await countSubmissionsByStatus()).pending).toBe(MAX_PENDING_PER_GUEST);
  });

  it("notifies the guest of each review exactly once", async () => {
    const a = await upload(fatima);
    const b = await upload(fatima);
    await approveSubmission(a.id, admin);
    await rejectSubmission(b.id, null, admin);
    expect(await takeReviewNotifications(fatima)).toEqual({approved: 1, rejected: 1});
    expect(await takeReviewNotifications(fatima)).toEqual({approved: 0, rejected: 0});
  });

  it("removes a deleted guest's photo files along with their records", async () => {
    const photo = await upload(yousef);
    await deleteGuest(yousef, SYSTEM_ACTOR);
    expect((await countSubmissionsByStatus()).pending).toBe(0);
    expect(fs.existsSync(path.join(submissionsDir(), `${photo.id}.png`))).toBe(false);
  });
});
