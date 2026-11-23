import {audit, type Actor} from "@/lib/data/audit";
import {many, nowIso, one, run, transaction, type Params} from "@/lib/db";
import {AppError} from "@/lib/errors";
import {DEFAULT_THRESHOLDS, RANKS, rankFor, validThresholds, type Rank, type RankThresholds} from "@/lib/ranks";

/*
 * Verified attendance per National Day year. Rows come only from a staff check-in (source
 * 'checkin') or an administrator (source 'admin') — never from the guest, and never from
 * registering. The primary key (guest_id, event_year) makes duplicates impossible.
 */

export type AttendanceRecord = {year: number; source: "checkin" | "admin"; recordedBy: string; recordedAt: string};

/** The year of the current event (from Event settings). */
export async function currentEventYear(): Promise<number> {
  const row = await one<{value: string}>(`SELECT value FROM settings WHERE key = 'event_date'`);
  const year = Number(row?.value?.slice(0, 4));
  return Number.isInteger(year) && year >= 2000 ? year : new Date().getFullYear();
}

/** Records attendance for a year; a second call for the same guest and year changes nothing. */
export async function recordAttendance(guestId: string, year: number, source: "checkin" | "admin", actor: Actor): Promise<boolean> {
  if (!Number.isInteger(year) || year < 2000 || year > 2100) throw new AppError("invalidInput");
  const changed = await run(
    `INSERT OR IGNORE INTO attendance (guest_id, event_year, source, recorded_by, recorded_at) VALUES (:guestId, :year, :source, :by, :now)`,
    {guestId, year, source, by: actor.name, now: nowIso()},
  );
  if (changed.changes === 1 && source === "admin") {
    await audit(actor, "attendance.added", `${await codeOf(guestId)}: ${year}`);
  }
  return changed.changes === 1;
}

/** Administrator: add a past (or current) year for a guest. */
export async function addAttendance(guestId: string, year: number, actor: Actor) {
  await transaction(async () => {
    if (!(await one(`SELECT 1 FROM guests WHERE id = :guestId`, {guestId}))) throw new AppError("guestNotFound");
    if (!(await recordAttendance(guestId, year, "admin", actor))) throw new AppError("attendanceExists", {year});
  });
}

/** Administrator correction: remove a wrongly recorded year. */
export async function removeAttendance(guestId: string, year: number, actor: Actor) {
  await transaction(async () => {
    const changed = await run(`DELETE FROM attendance WHERE guest_id = :guestId AND event_year = :year`, {guestId, year});
    if (changed.changes !== 1) throw new AppError("notFound");
    await audit(actor, "attendance.removed", `${await codeOf(guestId)}: ${year}`);
  });
}

async function codeOf(guestId: string) {
  return (await one<{code: string}>(`SELECT code FROM guests WHERE id = :guestId`, {guestId}))?.code ?? guestId;
}

export async function listAttendance(guestId: string): Promise<AttendanceRecord[]> {
  return (
    await many<{event_year: number; source: "checkin" | "admin"; recorded_by: string; recorded_at: string}>(
      `SELECT event_year, source, recorded_by, recorded_at FROM attendance WHERE guest_id = :guestId ORDER BY event_year DESC`,
      {guestId},
    )
  ).map((row) => ({year: row.event_year, source: row.source, recordedBy: row.recorded_by, recordedAt: row.recorded_at}));
}

/* ───────────── Thresholds ───────────── */

export async function getRankThresholds(): Promise<RankThresholds> {
  const row = await one<{value: string}>(`SELECT value FROM settings WHERE key = 'rank_thresholds'`);
  try {
    const parsed = {...DEFAULT_THRESHOLDS, ...(JSON.parse(row?.value ?? "{}") as Partial<RankThresholds>)};
    return validThresholds(parsed) ? parsed : DEFAULT_THRESHOLDS;
  } catch {
    return DEFAULT_THRESHOLDS;
  }
}

export async function saveRankThresholds(thresholds: RankThresholds, actor: Actor) {
  if (!validThresholds(thresholds)) throw new AppError("invalidThresholds");
  const value = JSON.stringify(Object.fromEntries(RANKS.map((rank) => [rank, thresholds[rank]])));
  await transaction(async () => {
    await run(`INSERT INTO settings (key, value) VALUES ('rank_thresholds', :value) ON CONFLICT(key) DO UPDATE SET value = excluded.value`, {value});
    await audit(actor, "ranks.thresholds_updated", RANKS.map((rank) => `${rank} ${thresholds[rank]}`).join(", "));
  });
}

/* ───────────── A guest's rank ───────────── */

export async function guestRank(guestId: string) {
  const [history, thresholds] = [await listAttendance(guestId), await getRankThresholds()];
  return {...rankFor(history.length, thresholds), history, thresholds};
}

/* ───────────── Administrator views ───────────── */

/** SQL condition selecting guests whose attendance count `n` falls in a rank's range. */
function rankCondition(rank: Rank | "none", thresholds: RankThresholds): {sql: string; params: Params} {
  if (rank === "none") return {sql: "n < :min", params: {min: thresholds[RANKS[0]]}};
  const index = RANKS.indexOf(rank);
  const upper = RANKS[index + 1];
  return upper ? {sql: "n >= :min AND n < :max", params: {min: thresholds[rank], max: thresholds[upper]}} : {sql: "n >= :min", params: {min: thresholds[rank]}};
}

const COUNTS = `SELECT g.id, g.code, g.full_name, g.category, g.is_active, COUNT(a.event_year) AS n,
                       GROUP_CONCAT(a.event_year) AS years
                FROM guests g LEFT JOIN attendance a ON a.guest_id = g.id GROUP BY g.id`;

export type RankedGuest = {id: string; code: string; fullName: string; attended: number; years: number[]; rank: Rank | null};

export async function listRankedGuests({rank = "all", query = "", limit = 25, offset = 0}: {rank?: Rank | "none" | "all"; query?: string; limit?: number; offset?: number} = {}) {
  const thresholds = await getRankThresholds();
  const clauses = ["is_active = 1"];
  let params: Params = {};
  if (rank !== "all") {
    const condition = rankCondition(rank, thresholds);
    clauses.push(condition.sql);
    params = {...params, ...condition.params};
  }
  if (query.trim()) {
    clauses.push("(full_name LIKE :q OR code LIKE :q)");
    params.q = `%${query.trim().replace(/[%_]/g, "")}%`;
  }
  const where = `WHERE ${clauses.join(" AND ")}`;
  const rows = await many<{id: string; code: string; full_name: string; n: number; years: string | null}>(
    `SELECT * FROM (${COUNTS}) ${where} ORDER BY n DESC, CAST(SUBSTR(code, 3) AS INTEGER) LIMIT :limit OFFSET :offset`,
    {...params, limit, offset},
  );
  const total = (await one<{n: number}>(`SELECT COUNT(*) AS n FROM (${COUNTS}) ${where}`, params))?.n ?? 0;
  return {
    total,
    thresholds,
    guests: rows.map<RankedGuest>((row) => ({
      id: row.id,
      code: row.code,
      fullName: row.full_name,
      attended: row.n,
      years: (row.years ?? "").split(",").filter(Boolean).map(Number).sort((a, b) => b - a),
      rank: rankFor(row.n, thresholds).rank,
    })),
  };
}

/** Active guests per rank (plus those without a rank yet) and attendance per year. */
export async function rankStats() {
  const thresholds = await getRankThresholds();
  const counts = {none: 0, silver: 0, gold: 0, platinum: 0, crystal: 0} as Record<Rank | "none", number>;
  for (const row of await many<{n: number; guests: number}>(`SELECT n, COUNT(*) AS guests FROM (${COUNTS}) WHERE is_active = 1 GROUP BY n`)) {
    counts[rankFor(row.n, thresholds).rank ?? "none"] += row.guests;
  }
  const byYear = await many<{year: number; n: number}>(`SELECT event_year AS year, COUNT(*) AS n FROM attendance GROUP BY event_year ORDER BY event_year DESC`);
  return {counts, byYear, thresholds};
}
