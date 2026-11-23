import {nowIso, one, run} from "@/lib/db";
import {AppError} from "@/lib/errors";

const WINDOW_MS = 15 * 60 * 1000;

/**
 * Failure limits per window. Accounts lock after a few misses; the IP limit is much
 * looser because a whole venue (staff desks, guests on event Wi-Fi) can share one address.
 */
export const LIMITS = {account: 5, ip: 50} as const;

/** Throws `tooManyAttempts` if `key` has reached `max` failures within the window. */
export async function assertNotLocked(key: string, max: number) {
  const row = await one<{failures: number; window_start: string}>(`SELECT failures, window_start FROM login_attempts WHERE key = :key`, {key});
  if (!row) {
    return;
  }
  const elapsed = Date.now() - Date.parse(row.window_start);
  if (elapsed > WINDOW_MS) {
    await run(`DELETE FROM login_attempts WHERE key = :key`, {key});
    return;
  }
  if (row.failures >= max) {
    throw new AppError("tooManyAttempts", {minutes: Math.ceil((WINDOW_MS - elapsed) / 60000)});
  }
}

export async function recordFailure(key: string) {
  await run(
    `INSERT INTO login_attempts (key, failures, window_start) VALUES (:key, 1, :now)
     ON CONFLICT(key) DO UPDATE SET failures = failures + 1`,
    {key, now: nowIso()},
  );
}

export async function clearFailures(key: string) {
  await run(`DELETE FROM login_attempts WHERE key = :key`, {key});
}
