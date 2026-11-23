import {randomInt} from "node:crypto";

import {audit, type Actor} from "@/lib/data/audit";
import {getGuestByCode} from "@/lib/data/guests";
import type {StaffRole} from "@/lib/data/staff";
import {many, newId, nowIso, one, run, transaction, type Params} from "@/lib/db";
import {AppError} from "@/lib/errors";

/*
 * National Day prizes.
 *
 * Games are physical and run by staff; guests bring their results to the IT Desk,
 * which records each guest's totals here. Two prizes:
 *   1. Teddy bear — win rate of at least 75% (won / played).
 *   2. Grand prize — a random draw over registered Guest IDs at the end of the event.
 */

export const TEDDY_THRESHOLD_PERCENT = 75;

/** Exact integer comparison (no floating point): won/played ≥ 75%  ⇔  won·100 ≥ 75·played. */
export function isTeddyEligible(played: number, won: number) {
  return played > 0 && won * 100 >= TEDDY_THRESHOLD_PERCENT * played;
}

/** Win rate as a percentage with one decimal (e.g. 66.7), or null before any game is recorded. */
export function winRate(played: number, won: number): number | null {
  return played > 0 ? Math.round((won / played) * 1000) / 10 : null;
}

/* ───────────── IT Desk: game results ───────────── */

export type GameResult = {
  guestId: string;
  guestCode: string;
  guestName: string;
  gamesPlayed: number;
  gamesWon: number;
  winRate: number | null;
  eligible: boolean;
  teddyCollectedAt: string | null;
  teddyCollectedBy: string | null;
  recordedBy: string;
  updatedAt: string;
};

type ResultRow = {
  guest_id: string;
  code: string;
  full_name: string;
  games_played: number;
  games_won: number;
  teddy_collected_at: string | null;
  teddy_collected_by: string | null;
  recorded_by: string;
  updated_at: string;
};

const RESULT_SELECT = `SELECT r.*, g.code, g.full_name FROM game_results r JOIN guests g ON g.id = r.guest_id`;

const toResult = (row: ResultRow): GameResult => ({
  guestId: row.guest_id,
  guestCode: row.code,
  guestName: row.full_name,
  gamesPlayed: row.games_played,
  gamesWon: row.games_won,
  winRate: winRate(row.games_played, row.games_won),
  eligible: isTeddyEligible(row.games_played, row.games_won),
  teddyCollectedAt: row.teddy_collected_at,
  teddyCollectedBy: row.teddy_collected_by,
  recordedBy: row.recorded_by,
  updatedAt: row.updated_at,
});

export async function getGameResult(guestId: string): Promise<GameResult | null> {
  const row = await one<ResultRow>(`${RESULT_SELECT} WHERE r.guest_id = :guestId`, {guestId});
  return row ? toResult(row) : null;
}

/** Results for several guests in one query (e.g. a page of the guest list). */
export async function getGameResultsFor(guestIds: string[]): Promise<Map<string, GameResult>> {
  if (!guestIds.length) return new Map();
  const params: Params = Object.fromEntries(guestIds.map((id, index) => [`id${index}`, id]));
  const rows = await many<ResultRow>(`${RESULT_SELECT} WHERE r.guest_id IN (${guestIds.map((_, index) => `:id${index}`).join(", ")})`, params);
  return new Map(rows.map((row) => [row.guest_id, toResult(row)]));
}

/**
 * Records a guest's totals (games played / won), replacing previous totals.
 * Once the teddy bear has been collected, only an administrator may change the
 * results — so desk staff can't alter a record after the prize was handed out.
 */
export async function saveGameResult(input: {guestCode: string; gamesPlayed: number; gamesWon: number}, staff: {actor: Actor; role: StaffRole}): Promise<GameResult> {
  if (input.gamesWon > input.gamesPlayed) {
    throw new AppError("wonExceedsPlayed");
  }
  return transaction(async () => {
    const guest = await getGuestByCode(input.guestCode);
    if (!guest) {
      throw new AppError("guestNotFound");
    }
    if (!guest.isActive) {
      throw new AppError("guestInactive");
    }
    const existing = await getGameResult(guest.id);
    if (existing?.teddyCollectedAt && staff.role !== "admin") {
      throw new AppError("resultLocked");
    }
    const now = nowIso();
    if (existing) {
      await run(`UPDATE game_results SET games_played = :played, games_won = :won, recorded_by = :by, updated_at = :now WHERE guest_id = :guestId`, {
        guestId: guest.id,
        played: input.gamesPlayed,
        won: input.gamesWon,
        by: staff.actor.name,
        now,
      });
      await audit(staff.actor, "results.updated", `${guest.code}: ${existing.gamesWon}/${existing.gamesPlayed} → ${input.gamesWon}/${input.gamesPlayed}`);
    } else {
      await run(
        `INSERT INTO game_results (guest_id, games_played, games_won, recorded_by, created_at, updated_at) VALUES (:guestId, :played, :won, :by, :now, :now)`,
        {guestId: guest.id, played: input.gamesPlayed, won: input.gamesWon, by: staff.actor.name, now},
      );
      await audit(staff.actor, "results.recorded", `${guest.code}: ${input.gamesWon}/${input.gamesPlayed}`);
    }
    return (await getGameResult(guest.id))!;
  });
}

export type ResultFilter = "all" | "eligible" | "collected" | "toCollect" | "notEligible";

export async function listGameResults({query = "", filter = "all", limit = 200}: {query?: string; filter?: ResultFilter; limit?: number} = {}): Promise<GameResult[]> {
  const clauses: string[] = [];
  const params: Params = {limit};
  const q = query.trim();
  if (q) {
    clauses.push("(g.code LIKE :q OR g.full_name LIKE :q)");
    params.q = `%${q.replace(/[%_]/g, "")}%`;
  }
  // Same integer rule as isTeddyEligible, in SQL.
  const eligibleSql = `(r.games_played > 0 AND r.games_won * 100 >= ${TEDDY_THRESHOLD_PERCENT} * r.games_played)`;
  if (filter === "eligible") clauses.push(eligibleSql);
  if (filter === "notEligible") clauses.push(`NOT ${eligibleSql}`);
  if (filter === "collected") clauses.push("r.teddy_collected_at IS NOT NULL");
  if (filter === "toCollect") clauses.push(`${eligibleSql} AND r.teddy_collected_at IS NULL`);
  const where = clauses.length ? `WHERE ${clauses.join(" AND ")}` : "";
  return (await many<ResultRow>(`${RESULT_SELECT} ${where} ORDER BY r.updated_at DESC LIMIT :limit`, params)).map(toResult);
}

/* ───────────── Teddy bear ───────────── */

/** Marks the teddy bear as handed over. The conditional UPDATE makes double collection impossible, even from two desks at once. */
export async function markTeddyCollected(guestId: string, actor: Actor): Promise<GameResult> {
  return transaction(async () => {
    const result = await getGameResult(guestId);
    if (!result) {
      throw new AppError("noResults");
    }
    if (!result.eligible) {
      throw new AppError("notEligible", {threshold: TEDDY_THRESHOLD_PERCENT});
    }
    const changed = await run(`UPDATE game_results SET teddy_collected_at = :now, teddy_collected_by = :by WHERE guest_id = :guestId AND teddy_collected_at IS NULL`, {
      guestId,
      now: nowIso(),
      by: actor.name,
    });
    if (changed.changes !== 1) {
      throw new AppError("teddyAlreadyCollected");
    }
    await audit(actor, "teddy.collected", `${result.guestCode} (${result.gamesWon}/${result.gamesPlayed})`);
    return (await getGameResult(guestId))!;
  });
}

/** Administrator correction, e.g. a collection recorded against the wrong guest. */
export async function undoTeddyCollection(guestId: string, actor: Actor) {
  await transaction(async () => {
    const result = await getGameResult(guestId);
    if (!result?.teddyCollectedAt) {
      throw new AppError("notFound");
    }
    await run(`UPDATE game_results SET teddy_collected_at = NULL, teddy_collected_by = NULL WHERE guest_id = :guestId`, {guestId});
    await audit(actor, "teddy.collection_undone", result.guestCode);
  });
}

/* ───────────── Grand prize draw ───────────── */

export type DrawStatus = "drawn" | "final" | "void";

export type GrandPrizeDraw = {
  id: string;
  guestCode: string;
  guestName: string;
  entries: number;
  status: DrawStatus;
  drawnBy: string;
  drawnAt: string;
  finalizedBy: string | null;
  finalizedAt: string | null;
};

type DrawRow = {
  id: string;
  guest_code: string;
  guest_name: string;
  entries: number;
  status: DrawStatus;
  drawn_by: string;
  drawn_at: string;
  finalized_by: string | null;
  finalized_at: string | null;
};

const toDraw = (row: DrawRow): GrandPrizeDraw => ({
  id: row.id,
  guestCode: row.guest_code,
  guestName: row.guest_name,
  entries: row.entries,
  status: row.status,
  drawnBy: row.drawn_by,
  drawnAt: row.drawn_at,
  finalizedBy: row.finalized_by,
  finalizedAt: row.finalized_at,
});

/**
 * Eligible entries: every active registered guest whose Guest ID hasn't been drawn
 * before (a drawn ID — finalized or cancelled — can never be drawn again).
 */
export async function listDrawEntries({checkedInOnly = false} = {}): Promise<Array<{id: string; code: string; name: string}>> {
  return (await many<{id: string; code: string; full_name: string}>(
    `SELECT id, code, full_name FROM guests
     WHERE is_active = 1 ${checkedInOnly ? "AND checked_in_at IS NOT NULL" : ""}
       AND id NOT IN (SELECT guest_id FROM grand_prize_draws WHERE guest_id IS NOT NULL)
     ORDER BY CAST(SUBSTR(code, 3) AS INTEGER), code`,
  )).map((row) => ({id: row.id, code: row.code, name: row.full_name}));
}

export async function listDraws(): Promise<GrandPrizeDraw[]> {
  return (await many<DrawRow>(`SELECT * FROM grand_prize_draws ORDER BY drawn_at DESC`)).map(toDraw);
}

/** Draws one winner uniformly at random (CSPRNG) from the eligible entries. */
export async function drawGrandPrize({checkedInOnly = false}: {checkedInOnly?: boolean}, actor: Actor): Promise<GrandPrizeDraw> {
  return transaction(async () => {
    if (await one(`SELECT 1 FROM grand_prize_draws WHERE status = 'drawn'`)) {
      throw new AppError("drawPending");
    }
    const entries = await listDrawEntries({checkedInOnly});
    if (!entries.length) {
      throw new AppError("noEntries");
    }
    const winner = entries[randomInt(entries.length)];
    const id = newId();
    await run(
      `INSERT INTO grand_prize_draws (id, guest_id, guest_code, guest_name, entries, status, drawn_by, drawn_at)
       VALUES (:id, :guestId, :code, :name, :entries, 'drawn', :by, :now)`,
      {id, guestId: winner.id, code: winner.code, name: winner.name, entries: entries.length, by: actor.name, now: nowIso()},
    );
    await audit(actor, "draw.drawn", `${winner.code} — ${winner.name} (1 of ${entries.length} entries${checkedInOnly ? ", checked-in only" : ""})`);
    return toDraw((await one<DrawRow>(`SELECT * FROM grand_prize_draws WHERE id = :id`, {id}))!);
  });
}

async function settleDraw(id: string, status: "final" | "void", actor: Actor) {
  await transaction(async () => {
    const row = await one<DrawRow>(`SELECT * FROM grand_prize_draws WHERE id = :id`, {id});
    if (!row) {
      throw new AppError("notFound");
    }
    if (row.status !== "drawn") {
      throw new AppError("drawSettled");
    }
    await run(`UPDATE grand_prize_draws SET status = :status, finalized_by = :by, finalized_at = :now WHERE id = :id`, {id, status, by: actor.name, now: nowIso()});
    await audit(actor, status === "final" ? "draw.finalized" : "draw.cancelled", `${row.guest_code} — ${row.guest_name}`);
  });
}

/** Confirms the winner (e.g. after announcing at the closing ceremony). */
export async function finalizeDraw(id: string, actor: Actor) {
  await settleDraw(id, "final", actor);
}

/** Cancels a draw (e.g. winner not present); that Guest ID stays excluded from later draws. */
export async function cancelDraw(id: string, actor: Actor) {
  await settleDraw(id, "void", actor);
}

/* ───────────── Overview ───────────── */

export async function prizeStats() {
  const eligibleSql = `(games_played > 0 AND games_won * 100 >= ${TEDDY_THRESHOLD_PERCENT} * games_played)`;
  const row = (await one<{recorded: number; eligible: number; collected: number}>(
    `SELECT COUNT(*) AS recorded, COALESCE(SUM(${eligibleSql}), 0) AS eligible, COUNT(teddy_collected_at) AS collected FROM game_results`,
  ))!;
  const winners = (await one<{n: number}>(`SELECT COUNT(*) AS n FROM grand_prize_draws WHERE status = 'final'`))!.n;
  return {...row, grandPrizeWinners: winners};
}
