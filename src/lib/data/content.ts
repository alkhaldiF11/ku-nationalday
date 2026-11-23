import {audit, type Actor} from "@/lib/data/audit";
import {many, newId, nowIso, one, run, transaction} from "@/lib/db";
import {AppError} from "@/lib/errors";
import {putFile, removeFile} from "@/lib/storage";

/* ───────────── Activities (event programme) ───────────── */

export const ACTIVITY_CATEGORIES = ["welcome", "ceremony", "music", "culture", "food", "games", "general"] as const;
export type ActivityCategory = (typeof ACTIVITY_CATEGORIES)[number];

/** English fields are required; Arabic ones are optional and fall back to English. */
export type Activity = {
  id: string;
  title: string;
  titleAr: string | null;
  description: string;
  descriptionAr: string | null;
  location: string;
  locationAr: string | null;
  date: string;
  startTime: string;
  endTime: string;
  category: ActivityCategory;
  isActive: boolean;
};

type ActivityRow = {
  id: string;
  title: string;
  title_ar: string | null;
  description: string;
  description_ar: string | null;
  location: string;
  location_ar: string | null;
  date: string;
  start_time: string;
  end_time: string;
  category: ActivityCategory;
  is_active: number;
};

const toActivity = (row: ActivityRow): Activity => ({
  id: row.id,
  title: row.title,
  titleAr: row.title_ar,
  description: row.description,
  descriptionAr: row.description_ar,
  location: row.location,
  locationAr: row.location_ar,
  date: row.date,
  startTime: row.start_time,
  endTime: row.end_time,
  category: row.category,
  isActive: row.is_active === 1,
});

/**
 * Text for one locale. `alt` is the other language's title — shown underneath,
 * like the bilingual event posters — or null when there is no translation.
 */
export function localizeActivity(activity: Activity, locale: "en" | "ar") {
  const ar = locale === "ar";
  const title = ar ? activity.titleAr || activity.title : activity.title;
  const alt = activity.titleAr ? (ar ? activity.title : activity.titleAr) : null;
  return {
    title,
    alt: alt && alt !== title ? alt : null,
    location: ar ? activity.locationAr || activity.location : activity.location,
    description: ar ? activity.descriptionAr || activity.description : activity.description,
  };
}

export async function listActivities({activeOnly = true} = {}): Promise<Activity[]> {
  return (await many<ActivityRow>(`SELECT * FROM activities ${activeOnly ? "WHERE is_active = 1" : ""} ORDER BY date, start_time, title`)).map(toActivity);
}

export async function saveActivity(input: Omit<Activity, "id"> & {id?: string}, actor: Actor) {
  const params = {
    title: input.title.trim(),
    titleAr: input.titleAr?.trim() || null,
    description: input.description.trim(),
    descriptionAr: input.descriptionAr?.trim() || null,
    location: input.location.trim(),
    locationAr: input.locationAr?.trim() || null,
    date: input.date,
    start: input.startTime,
    end: input.endTime,
    category: input.category,
    active: input.isActive ? 1 : 0,
    now: nowIso(),
  };
  return transaction(async () => {
    if (input.id) {
      const changed = await run(
        `UPDATE activities SET title = :title, title_ar = :titleAr, description = :description, description_ar = :descriptionAr,
         location = :location, location_ar = :locationAr, date = :date, start_time = :start,
         end_time = :end, category = :category, is_active = :active, updated_at = :now WHERE id = :id`,
        {...params, id: input.id},
      );
      if (changed.changes === 0) {
        throw new AppError("notFound");
      }
      await audit(actor, "activity.updated", `${params.title} ${params.date} ${params.start}`);
      return input.id;
    }
    const id = newId();
    await run(
      `INSERT INTO activities (id, title, title_ar, description, description_ar, location, location_ar, date, start_time, end_time, category, is_active, created_at, updated_at)
       VALUES (:id, :title, :titleAr, :description, :descriptionAr, :location, :locationAr, :date, :start, :end, :category, :active, :now, :now)`,
      {...params, id},
    );
    await audit(actor, "activity.created", `${params.title} ${params.date} ${params.start}`);
    return id;
  });
}

export async function deleteActivity(id: string, actor: Actor) {
  const row = await one<{title: string}>(`SELECT title FROM activities WHERE id = :id`, {id});
  if (!row) {
    throw new AppError("notFound");
  }
  await run(`DELETE FROM activities WHERE id = :id`, {id});
  await audit(actor, "activity.deleted", row.title);
}

/* ───────────── Announcements ───────────── */

export type Announcement = {id: string; title: string; body: string; isPublished: boolean; createdBy: string; createdAt: string};

type AnnouncementRow = {id: string; title: string; body: string; is_published: number; created_by: string; created_at: string};

const toAnnouncement = (row: AnnouncementRow): Announcement => ({
  id: row.id,
  title: row.title,
  body: row.body,
  isPublished: row.is_published === 1,
  createdBy: row.created_by,
  createdAt: row.created_at,
});

export async function listAnnouncements({publishedOnly = true, limit = 50} = {}): Promise<Announcement[]> {
  return (await many<AnnouncementRow>(
    `SELECT * FROM announcements ${publishedOnly ? "WHERE is_published = 1" : ""} ORDER BY created_at DESC LIMIT :limit`,
    {limit},
  )).map(toAnnouncement);
}

export async function saveAnnouncement(input: {id?: string; title: string; body: string; isPublished: boolean}, actor: Actor) {
  const params = {title: input.title.trim(), body: input.body.trim(), published: input.isPublished ? 1 : 0};
  if (input.id) {
    const changed = await run(`UPDATE announcements SET title = :title, body = :body, is_published = :published WHERE id = :id`, {...params, id: input.id});
    if (changed.changes === 0) {
      throw new AppError("notFound");
    }
    await audit(actor, "announcement.updated", params.title);
    return input.id;
  }
  const id = newId();
  await run(`INSERT INTO announcements (id, title, body, is_published, created_by, created_at) VALUES (:id, :title, :body, :published, :by, :now)`, {
    ...params,
    id,
    by: actor.name,
    now: nowIso(),
  });
  await audit(actor, "announcement.created", params.title);
  return id;
}

export async function deleteAnnouncement(id: string, actor: Actor) {
  const row = await one<{title: string}>(`SELECT title FROM announcements WHERE id = :id`, {id});
  if (!row) {
    throw new AppError("notFound");
  }
  await run(`DELETE FROM announcements WHERE id = :id`, {id});
  await audit(actor, "announcement.deleted", row.title);
}

/* ───────────── Gallery ───────────── */

export type GalleryImage = {id: string; title: string; caption: string | null; category: string; albumYear: number; src: string; uploadedBy: string; createdAt: string};

type GalleryRow = {id: string; title: string; caption: string | null; category: string; album_year: number | null; file_name: string; uploaded_by: string; created_at: string};

const toImage = (row: GalleryRow): GalleryImage => ({
  id: row.id,
  title: row.title,
  caption: row.caption,
  category: row.category,
  albumYear: row.album_year ?? Number(row.created_at.slice(0, 4)),
  src: `/media/${row.file_name}`,
  uploadedBy: row.uploaded_by,
  createdAt: row.created_at,
});

export async function listGallery({year, limit = 500}: {year?: number; limit?: number} = {}): Promise<GalleryImage[]> {
  const where = year ? "WHERE album_year = :year" : "";
  return (await many<GalleryRow>(`SELECT * FROM gallery_images ${where} ORDER BY created_at DESC LIMIT :limit`, year ? {year, limit} : {limit})).map(toImage);
}

/** Yearly albums (folders), newest first — including empty ones. Cover is the latest photo, if any. */
export async function listGalleryAlbums(): Promise<Array<{year: number; count: number; cover: string | null}>> {
  return (await many<{year: number; count: number; file_name: string | null}>(
    `SELECT a.year, COUNT(g.id) AS count,
            (SELECT file_name FROM gallery_images g2 WHERE g2.album_year = a.year ORDER BY created_at DESC LIMIT 1) AS file_name
     FROM gallery_albums a LEFT JOIN gallery_images g ON g.album_year = a.year
     GROUP BY a.year ORDER BY a.year DESC`,
  )).map((row) => ({year: row.year, count: row.count, cover: row.file_name ? `/media/${row.file_name}` : null}));
}

export async function albumExists(year: number) {
  return await one(`SELECT 1 FROM gallery_albums WHERE year = :year`, {year}) !== null;
}

export async function createAlbum(year: number, actor: Actor) {
  if (await albumExists(year)) {
    throw new AppError("albumExists", {year});
  }
  await run(`INSERT INTO gallery_albums (year, created_at) VALUES (:year, :now)`, {year, now: nowIso()});
  await audit(actor, "gallery.album_created", String(year));
}

/** Only empty albums can be deleted, so photos are never removed as a side effect. */
export async function deleteAlbum(year: number, actor: Actor) {
  await transaction(async () => {
    if (!await albumExists(year)) {
      throw new AppError("notFound");
    }
    if (await one(`SELECT 1 FROM gallery_images WHERE album_year = :year`, {year})) {
      throw new AppError("albumNotEmpty");
    }
    await run(`DELETE FROM gallery_albums WHERE year = :year`, {year});
    await audit(actor, "gallery.album_deleted", String(year));
  });
}

/** Photos may only be filed into an album that exists. */
async function assertAlbum(year: number) {
  if (!await albumExists(year)) {
    throw new AppError("albumNotFound", {year});
  }
}

export async function listGalleryCategories(): Promise<string[]> {
  return (await many<{category: string}>(`SELECT DISTINCT category FROM gallery_images ORDER BY category`)).map((row) => row.category);
}

/** Vercel caps a request at 4.5 MB; photos are shrunk in the browser first, so real uploads are ~1–2 MB. */
export const MAX_IMAGE_BYTES = 4 * 1024 * 1024;

/** Detects the real image type from magic bytes — the client-sent MIME type is not trusted. */
export function sniffImageType(bytes: Uint8Array): "jpg" | "png" | "webp" | null {
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return "jpg";
  if (bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47) return "png";
  if (
    bytes[0] === 0x52 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x46 &&
    bytes[8] === 0x57 && bytes[9] === 0x45 && bytes[10] === 0x42 && bytes[11] === 0x50
  ) return "webp";
  return null;
}

export async function addGalleryImage(input: {title: string; caption?: string | null; category: string; albumYear: number; bytes: Uint8Array}, actor: Actor) {
  if (input.bytes.byteLength > MAX_IMAGE_BYTES) {
    throw new AppError("imageTooLarge");
  }
  const ext = sniffImageType(input.bytes);
  if (!ext) {
    throw new AppError("invalidImage");
  }
  await assertAlbum(input.albumYear);
  const id = newId();
  const fileName = `${id}.${ext}`;
  await putFile(`uploads/${fileName}`, input.bytes);
  try {
    await run(
      `INSERT INTO gallery_images (id, title, caption, category, album_year, file_name, uploaded_by, created_at)
       VALUES (:id, :title, :caption, :category, :year, :fileName, :by, :now)`,
      {id, title: input.title.trim(), caption: input.caption?.trim() || null, category: input.category.trim() || "General", year: input.albumYear, fileName, by: actor.name, now: nowIso()},
    );
  } catch (error) {
    await removeFile(`uploads/${fileName}`);
    throw error;
  }
  await audit(actor, "gallery.uploaded", input.title.trim());
  return id;
}

export async function updateGalleryImage(id: string, patch: {title: string; caption?: string | null; category: string; albumYear: number}, actor: Actor) {
  await assertAlbum(patch.albumYear);
  const changed = await run(`UPDATE gallery_images SET title = :title, caption = :caption, category = :category, album_year = :year WHERE id = :id`, {
    id,
    year: patch.albumYear,
    title: patch.title.trim(),
    caption: patch.caption?.trim() || null,
    category: patch.category.trim() || "General",
  });
  if (changed.changes === 0) {
    throw new AppError("notFound");
  }
  await audit(actor, "gallery.updated", patch.title.trim());
}

export async function deleteGalleryImage(id: string, actor: Actor) {
  const row = await one<GalleryRow>(`SELECT * FROM gallery_images WHERE id = :id`, {id});
  if (!row) {
    throw new AppError("notFound");
  }
  await run(`DELETE FROM gallery_images WHERE id = :id`, {id});
  await removeFile(`uploads/${row.file_name}`);
  await audit(actor, "gallery.deleted", row.title);
}

/* ───────────── Settings ───────────── */

export type EventSettings = {
  eventName: string;
  eventDate: string;
  eventVenue: string;
  contactEmail: string;
  contactPhone: string;
  /** Home-page countdown: counts down to this date (defaults to the event date). */
  countdownEnabled: boolean;
  countdownDate: string;
  countdownLabelEn: string;
  countdownLabelAr: string;
  /** Accepted domains for student/staff sign-ups (comma-separated, subdomains included). */
  universityDomains: string;
};

export async function getSettings(): Promise<EventSettings> {
  const rows = await many<{key: string; value: string}>(`SELECT key, value FROM settings`);
  const map = Object.fromEntries(rows.map((row) => [row.key, row.value]));
  return {
    eventName: map.event_name ?? "Kingdom University National Day",
    eventDate: map.event_date ?? "2026-12-16",
    eventVenue: map.event_venue ?? "Kingdom University Campus",
    contactEmail: map.contact_email ?? "events@ku.edu.bh",
    contactPhone: map.contact_phone ?? "",
    countdownEnabled: (map.countdown_enabled ?? "1") === "1",
    countdownDate: map.countdown_date || (map.event_date ?? "2026-12-16"),
    countdownLabelEn: map.countdown_label_en ?? "",
    countdownLabelAr: map.countdown_label_ar ?? "",
    universityDomains: map.university_email_domains ?? "ku.edu.bh",
  };
}

export async function saveSettings(settings: EventSettings, actor: Actor) {
  const entries: Record<string, string> = {
    event_name: settings.eventName.trim(),
    event_date: settings.eventDate,
    event_venue: settings.eventVenue.trim(),
    contact_email: settings.contactEmail.trim(),
    contact_phone: settings.contactPhone.trim(),
    countdown_enabled: settings.countdownEnabled ? "1" : "0",
    countdown_date: settings.countdownDate,
    countdown_label_en: settings.countdownLabelEn.trim(),
    countdown_label_ar: settings.countdownLabelAr.trim(),
    university_email_domains: settings.universityDomains
      .split(/[\s,;]+/)
      .map((domain) => domain.trim().toLowerCase().replace(/^@/, ""))
      .filter(Boolean)
      .join(", "),
  };
  await transaction(async () => {
    for (const [key, value] of Object.entries(entries)) {
      await run(`INSERT INTO settings (key, value) VALUES (:key, :value) ON CONFLICT(key) DO UPDATE SET value = excluded.value`, {key, value});
    }
    await audit(actor, "settings.updated", settings.eventName.trim());
  });
}

/* ───────────── Dashboard stats ───────────── */

export async function dashboardStats() {
  const guests = (await one<{total: number; active: number; checked_in: number}>(
    `SELECT COUNT(*) AS total, COALESCE(SUM(is_active), 0) AS active, COUNT(checked_in_at) AS checked_in FROM guests`,
  ))!;
  const registrationsByHour = (await many<{hour: string; n: number}>(
    `SELECT SUBSTR(created_at, 1, 13) AS hour, COUNT(*) AS n FROM guests GROUP BY hour ORDER BY hour DESC LIMIT 12`,
  )).reverse();
  return {
    guests: guests.total,
    activeGuests: guests.active,
    checkedIn: guests.checked_in,
    registrationsByHour,
  };
}
