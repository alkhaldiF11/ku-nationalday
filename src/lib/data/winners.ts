import {audit, type Actor} from "@/lib/data/audit";
import {getGuestByCode} from "@/lib/data/guests";
import {many, newId, nowIso, one, run, transaction} from "@/lib/db";
import {AppError} from "@/lib/errors";

/*
 * Winner announcements. An administrator chooses the guest and the prize — nothing here is
 * random or automatic. The guest sees a congratulations pop-up once (until they dismiss it,
 * which sets seen_at), and the award stays in their rewards history.
 */

export type WinnerAnnouncement = {
  id: string;
  guestId: string;
  guestCode: string;
  guestName: string;
  prize: string;
  message: string | null;
  announcedByName: string;
  announcedAt: string;
  seenAt: string | null;
};

type Row = {id: string; guest_id: string; code: string; full_name: string; prize: string; message: string | null; announced_by_name: string; announced_at: string; seen_at: string | null};

const SELECT = `SELECT w.id, w.guest_id, g.code, g.full_name, w.prize, w.message, w.announced_by_name, w.announced_at, w.seen_at
                FROM winner_announcements w JOIN guests g ON g.id = w.guest_id`;

const toAnnouncement = (row: Row): WinnerAnnouncement => ({
  id: row.id,
  guestId: row.guest_id,
  guestCode: row.code,
  guestName: row.full_name,
  prize: row.prize,
  message: row.message,
  announcedByName: row.announced_by_name,
  announcedAt: row.announced_at,
  seenAt: row.seen_at,
});

/** Administrator: officially announce a winner. The same prize can't be announced twice to one guest. */
export async function announceWinner(input: {guestCode: string; prize: string; message?: string | null}, actor: Actor): Promise<WinnerAnnouncement> {
  const prize = input.prize.trim();
  if (!prize) throw new AppError("invalidInput");
  return transaction(async () => {
    const guest = await getGuestByCode(input.guestCode);
    if (!guest) throw new AppError("guestNotFound");
    if (!guest.isActive) throw new AppError("guestInactive");
    if (await one(`SELECT 1 FROM winner_announcements WHERE guest_id = :guestId AND lower(trim(prize)) = lower(:prize)`, {guestId: guest.id, prize})) {
      throw new AppError("winnerDuplicate", {code: guest.code, prize});
    }
    const id = newId();
    await run(
      `INSERT INTO winner_announcements (id, guest_id, prize, message, announced_by, announced_by_name, announced_at)
       VALUES (:id, :guestId, :prize, :message, :by, :byName, :now)`,
      {id, guestId: guest.id, prize, message: input.message?.trim() || null, by: actor.id, byName: actor.name, now: nowIso()},
    );
    await audit(actor, "winner.announced", `${guest.code} — ${prize}`);
    return toAnnouncement((await one<Row>(`${SELECT} WHERE w.id = :id`, {id}))!);
  });
}

/** Administrator: withdraw an announcement made by mistake. */
export async function withdrawAnnouncement(id: string, actor: Actor) {
  await transaction(async () => {
    const row = await one<Row>(`${SELECT} WHERE w.id = :id`, {id});
    if (!row) throw new AppError("notFound");
    await run(`DELETE FROM winner_announcements WHERE id = :id`, {id});
    await audit(actor, "winner.withdrawn", `${row.code} — ${row.prize}`);
  });
}

export async function listAnnouncements(limit = 200): Promise<WinnerAnnouncement[]> {
  return (await many<Row>(`${SELECT} ORDER BY w.announced_at DESC LIMIT :limit`, {limit})).map(toAnnouncement);
}

/** A guest's own awards (newest first) — the guest id always comes from the session. */
export async function guestAwards(guestId: string): Promise<WinnerAnnouncement[]> {
  return (await many<Row>(`${SELECT} WHERE w.guest_id = :guestId ORDER BY w.announced_at DESC`, {guestId})).map(toAnnouncement);
}

/** Awards the guest hasn't dismissed yet (shown as pop-ups, oldest first). */
export async function unseenAwards(guestId: string): Promise<WinnerAnnouncement[]> {
  return (await many<Row>(`${SELECT} WHERE w.guest_id = :guestId AND w.seen_at IS NULL ORDER BY w.announced_at`, {guestId})).map(toAnnouncement);
}

/** The guest dismissed the pop-up. Only their own announcement can be marked. */
export async function markAwardSeen(guestId: string, id: string) {
  await run(`UPDATE winner_announcements SET seen_at = :now WHERE id = :id AND guest_id = :guestId AND seen_at IS NULL`, {id, guestId, now: nowIso()});
}
