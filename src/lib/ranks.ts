/*
 * Attendance ranks — the single place that defines them.
 *
 * A guest's rank comes from the number of National Day events they verifiably attended
 * (one per year, see the `attendance` table). The minimum attendances for each rank are
 * stored in settings (`rank_thresholds`) and can be changed by an administrator in
 * Staff → Ranks & attendance. DEFAULT_THRESHOLDS applies until then.
 *
 * Adding a rank later: append it to RANKS (lowest → highest), give it a default threshold,
 * a palette in rank-emblem.tsx, and its names in the dictionaries (ranks.*).
 */

export const RANKS = ["silver", "gold", "platinum", "crystal"] as const;
export type Rank = (typeof RANKS)[number];
export type RankThresholds = Record<Rank, number>;

/** Initial thresholds (attendances needed): Silver 1, Gold 2, Platinum 3, Crystal 5. */
export const DEFAULT_THRESHOLDS: RankThresholds = {silver: 1, gold: 2, platinum: 3, crystal: 5};

/** Valid when every rank needs at least one attendance and each rank needs more than the one before. */
export function validThresholds(thresholds: RankThresholds) {
  return RANKS.every((rank, index) => Number.isInteger(thresholds[rank]) && thresholds[rank] >= 1 && thresholds[rank] <= 100 && (index === 0 || thresholds[rank] > thresholds[RANKS[index - 1]]));
}

export type RankProgress = {
  /** Highest rank reached, or null before the first attendance. */
  rank: Rank | null;
  /** The next rank to reach, or null at the top rank. */
  next: Rank | null;
  attended: number;
  /** Attendances needed for `next` (null at the top). */
  nextAt: number | null;
  /** 0–100: attendances so far out of those needed for the next rank. */
  percent: number;
};

export function rankFor(attended: number, thresholds: RankThresholds = DEFAULT_THRESHOLDS): RankProgress {
  let rank: Rank | null = null;
  for (const candidate of RANKS) {
    if (attended >= thresholds[candidate]) rank = candidate;
  }
  const next = RANKS.find((candidate) => attended < thresholds[candidate]) ?? null;
  const nextAt = next ? thresholds[next] : null;
  // Overall progress towards the next rank ("3 / 5 attendances" → 60%).
  const percent = nextAt === null ? 100 : Math.max(0, Math.min(100, Math.round((attended / nextAt) * 100)));
  return {rank, next, attended, nextAt, percent};
}
