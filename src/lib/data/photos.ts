import {audit, type Actor} from "@/lib/data/audit";
import {sniffImageType} from "@/lib/data/content";
import {many, newId, nowIso, one, run, transaction} from "@/lib/db";
import {AppError} from "@/lib/errors";
import {putFile, readFile, removeFile as removeStoredFile} from "@/lib/storage";

/*
 * Guest photo submissions with administrator moderation.
 *
 * Files are written to private storage and only ever served by /photos/[id], which
 * checks status and ownership on every request. Every rule below is enforced here,
 * server-side — the UI hiding a button is never the security boundary.
 */

export const PHOTO_STATUSES = ["pending", "approved", "rejected"] as const;
export type PhotoStatus = (typeof PHOTO_STATUSES)[number];

/** Per-file limit after the browser has downscaled the photo (originals are usually far larger). */
export const MAX_PHOTO_BYTES = 4 * 1024 * 1024; // the host caps requests at 4.5 MB
/** Stops one account from flooding the moderation queue. */
export const MAX_PENDING_PER_GUEST = 30;

export type PhotoSubmission = {
  id: string;
  src: string;
  title: string | null;
  caption: string | null;
  status: PhotoStatus;
  rejectionReason: string | null;
  reviewedByName: string | null;
  reviewedAt: string | null;
  createdAt: string;
  guestId: string;
  guestName: string;
  guestCode: string;
};

type Row = {
  id: string;
  guest_id: string;
  storage_path: string;
  title: string | null;
  caption: string | null;
  status: PhotoStatus;
  rejection_reason: string | null;
  reviewed_by_name: string | null;
  reviewed_at: string | null;
  created_at: string;
  full_name: string;
  code: string;
};

const SELECT = `SELECT s.*, g.full_name, g.code FROM photo_submissions s JOIN guests g ON g.id = s.guest_id`;

const toSubmission = (row: Row): PhotoSubmission => ({
  id: row.id,
  src: `/photos/${row.id}`,
  title: row.title,
  caption: row.caption,
  status: row.status,
  rejectionReason: row.rejection_reason,
  reviewedByName: row.reviewed_by_name,
  reviewedAt: row.reviewed_at,
  createdAt: row.created_at,
  guestId: row.guest_id,
  guestName: row.full_name,
  guestCode: row.code,
});

/** Storage key in private storage; refuses any stored name that isn't one we generated. */
function fileKey(storagePath: string) {
  if (!/^[0-9a-f-]{36}\.(jpg|png|webp)$/.test(storagePath)) {
    throw new AppError("notFound");
  }
  return `private/submissions/${storagePath}`;
}

async function removeFile(storagePath: string) {
  try {
    await removeStoredFile(fileKey(storagePath));
  } catch {
    // A missing file must not block removing the record.
  }
}

/* ───────────── Guest side ───────────── */

export async function submitPhoto(input: {guestId: string; bytes: Uint8Array; title?: string | null; caption?: string | null}, actor: Actor): Promise<PhotoSubmission> {
  if (input.bytes.byteLength === 0) {
    throw new AppError("invalidImage");
  }
  if (input.bytes.byteLength > MAX_PHOTO_BYTES) {
    throw new AppError("imageTooLarge");
  }
  const ext = sniffImageType(input.bytes);
  if (!ext) {
    throw new AppError("invalidImage");
  }

  const id = newId();
  const storagePath = `${id}.${ext}`;
  // Upload first (network) so the transaction stays short; undo the upload if the insert fails.
  await putFile(fileKey(storagePath), input.bytes);
  try {
    return await transaction(async () => {
      const pending = (await one<{n: number}>(`SELECT COUNT(*) AS n FROM photo_submissions WHERE guest_id = :guestId AND status = 'pending'`, {guestId: input.guestId}))!.n;
      if (pending >= MAX_PENDING_PER_GUEST) {
        throw new AppError("tooManyPending", {max: MAX_PENDING_PER_GUEST});
      }
      await run(
        `INSERT INTO photo_submissions (id, guest_id, storage_path, title, caption, status, guest_notified, created_at)
         VALUES (:id, :guestId, :storagePath, :title, :caption, 'pending', 1, :now)`,
        {id, guestId: input.guestId, storagePath, title: input.title?.trim() || null, caption: input.caption?.trim() || null, now: nowIso()},
      );
      await audit(actor, "photo.submitted", input.title?.trim() || storagePath);
      return toSubmission((await one<Row>(`${SELECT} WHERE s.id = :id`, {id}))!);
    });
  } catch (error) {
    await removeFile(storagePath);
    throw error;
  }
}

/** A guest's own submissions only — the guest id comes from the session, never from the client. */
export async function listGuestSubmissions(guestId: string): Promise<PhotoSubmission[]> {
  return (await many<Row>(`${SELECT} WHERE s.guest_id = :guestId ORDER BY s.created_at DESC`, {guestId})).map(toSubmission);
}

/** Guests may delete only their own submissions, and only while pending. */
export async function deleteOwnPendingSubmission(guestId: string, submissionId: string, actor: Actor) {
  await transaction(async () => {
    const row = await one<Row>(`${SELECT} WHERE s.id = :id AND s.guest_id = :guestId`, {id: submissionId, guestId});
    if (!row) {
      throw new AppError("notFound"); // also for other guests' photos: don't reveal they exist
    }
    if (row.status !== "pending") {
      throw new AppError("photoNotPending");
    }
    await run(`DELETE FROM photo_submissions WHERE id = :id`, {id: submissionId});
    await removeFile(row.storage_path);
    await audit(actor, "photo.withdrawn", row.title || row.storage_path);
  });
}

/** Reviews the guest hasn't been told about yet; marks them as told. */
export async function takeReviewNotifications(guestId: string) {
  return transaction(async () => {
    const rows = await many<{status: PhotoStatus}>(
      `SELECT status FROM photo_submissions WHERE guest_id = :guestId AND guest_notified = 0 AND status IN ('approved','rejected')`,
      {guestId},
    );
    if (rows.length) {
      await run(`UPDATE photo_submissions SET guest_notified = 1 WHERE guest_id = :guestId AND guest_notified = 0`, {guestId});
    }
    return {
      approved: rows.filter((row) => row.status === "approved").length,
      rejected: rows.filter((row) => row.status === "rejected").length,
    };
  });
}

/* ───────────── Administrator side ───────────── */

export async function countSubmissionsByStatus(): Promise<Record<PhotoStatus, number>> {
  const rows = await many<{status: PhotoStatus; n: number}>(`SELECT status, COUNT(*) AS n FROM photo_submissions GROUP BY status`);
  const counts = {pending: 0, approved: 0, rejected: 0};
  for (const row of rows) counts[row.status] = row.n;
  return counts;
}

export async function listSubmissions(status: PhotoStatus, {limit = 60, offset = 0} = {}) {
  const order = status === "pending" ? "s.created_at ASC" : "COALESCE(s.reviewed_at, s.created_at) DESC";
  return (await many<Row>(`${SELECT} WHERE s.status = :status ORDER BY ${order} LIMIT :limit OFFSET :offset`, {status, limit, offset})).map(toSubmission);
}

async function review(submissionId: string, status: "approved" | "rejected", reason: string | null, reviewer: Actor) {
  await transaction(async () => {
    const row = await one<Row>(`${SELECT} WHERE s.id = :id`, {id: submissionId});
    if (!row) {
      throw new AppError("notFound");
    }
    await run(
      `UPDATE photo_submissions SET status = :status, rejection_reason = :reason, reviewed_by = :by, reviewed_by_name = :byName,
       reviewed_at = :now, guest_notified = 0 WHERE id = :id`,
      {id: submissionId, status, reason, by: reviewer.id, byName: reviewer.name, now: nowIso()},
    );
    await audit(reviewer, status === "approved" ? "photo.approved" : "photo.rejected", `${row.title || "photo"} by ${row.full_name} (${row.code})${reason ? ` — ${reason}` : ""}`);
  });
}

export async function approveSubmission(submissionId: string, reviewer: Actor) {
  await review(submissionId, "approved", null, reviewer);
}

export async function rejectSubmission(submissionId: string, reason: string | null, reviewer: Actor) {
  await review(submissionId, "rejected", reason?.trim() || null, reviewer);
}

export async function deleteSubmission(submissionId: string, actor: Actor) {
  await transaction(async () => {
    const row = await one<Row>(`${SELECT} WHERE s.id = :id`, {id: submissionId});
    if (!row) {
      throw new AppError("notFound");
    }
    await run(`DELETE FROM photo_submissions WHERE id = :id`, {id: submissionId});
    await removeFile(row.storage_path);
    await audit(actor, "photo.deleted", `${row.title || "photo"} by ${row.full_name} (${row.code})`);
  });
}

/** Called before a guest account is deleted, so their files don't outlive the cascade. */
export async function removeGuestPhotoFiles(guestId: string) {
  for (const row of await many<{storage_path: string}>(`SELECT storage_path FROM photo_submissions WHERE guest_id = :guestId`, {guestId})) {
    await removeFile(row.storage_path);
  }
}

/* ───────────── Serving & public gallery ───────────── */

/**
 * Access decision for /photos/[id]. Approved photos are public; pending and rejected
 * ones only for their owner or an administrator. Everyone else gets null (served as 404).
 */
export async function readPhotoForViewer(submissionId: string, viewer: {guestId: string | null; isAdmin: boolean}) {
  if (!/^[0-9a-f-]{36}$/.test(submissionId)) {
    return null;
  }
  const row = await one<{guest_id: string; storage_path: string; status: PhotoStatus}>(
    `SELECT guest_id, storage_path, status FROM photo_submissions WHERE id = :id`,
    {id: submissionId},
  );
  if (!row) {
    return null;
  }
  const allowed = row.status === "approved" || viewer.isAdmin || viewer.guestId === row.guest_id;
  if (!allowed) {
    return null;
  }
  const file = await readFile(fileKey(row.storage_path));
  return file ? {...file, isPublic: row.status === "approved"} : null;
}

/**
 * Approved guest photos for the public gallery. Deliberately anonymous: the query never
 * touches the guests table, so no name or Guest ID can reach visitors. Only administrators
 * see who shared a photo (Photo Approval Management).
 */
export async function listApprovedGuestPhotos(limit = 200) {
  return (await many<{id: string; title: string | null; caption: string | null; reviewed_at: string | null; created_at: string}>(
    `SELECT id, title, caption, reviewed_at, created_at FROM photo_submissions WHERE status = 'approved' ORDER BY reviewed_at DESC LIMIT :limit`,
    {limit},
  )).map((row) => ({
    id: row.id,
    src: `/photos/${row.id}`,
    title: row.title,
    caption: row.caption,
    fromGuest: true as const,
    createdAt: row.reviewed_at ?? row.created_at,
  }));
}
