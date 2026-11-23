#!/usr/bin/env node
/**
 * Load-test data for the grand prize draw: bulk-creates guest accounts the way the IT Desk would.
 *
 *   node scripts/test-guests.mjs add [count=500]   create test guests
 *   node scripts/test-guests.mjs status            how many test guests / draw entries there are
 *   node scripts/test-guests.mjs remove            delete every test guest (and their results/draw links)
 *
 * Test guests are marked with notes = "[test-data]" and mobiles +973 399xxxxx, so they never mix
 * with real registrations. Remove them before the real event.
 *
 * Works on the local database (data/nationalday.db, backed up first) or, when TURSO_DATABASE_URL
 * and TURSO_AUTH_TOKEN are set (e.g. node --env-file=.env.vercel scripts/test-guests.mjs status), on the live Turso database.
 */
import fs from "node:fs";
import path from "node:path";
import {randomBytes, randomInt, randomUUID, scryptSync} from "node:crypto";
import {pathToFileURL} from "node:url";

import {createClient} from "@libsql/client";

const MARK = "[test-data]";
const PASSWORD = "Test@2026";
const ACTOR = "Load test script";

const remoteUrl = process.env.TURSO_DATABASE_URL ?? process.env.DATABASE_URL;
const localFile = process.env.DATABASE_PATH ?? path.join(path.resolve(process.env.DATA_DIR ?? "data"), "nationalday.db");
if (!remoteUrl && !fs.existsSync(localFile)) {
  console.error(`Database not found at ${localFile}. Start the app once so it creates and migrates it.`);
  process.exit(1);
}
const db = createClient(
  remoteUrl ? {url: remoteUrl, authToken: process.env.TURSO_AUTH_TOKEN ?? process.env.DATABASE_AUTH_TOKEN} : {url: pathToFileURL(localFile).href},
);
console.log(`Database: ${remoteUrl ? remoteUrl : localFile}`);

const first = async (sql, args = {}) => (await db.execute({sql, args})).rows[0];

/** Same format as src/lib/auth/password.ts: scrypt$N$r$p$saltHex$hashHex */
function hashPassword(password) {
  const salt = randomBytes(16);
  const hash = scryptSync(password, salt, 32, {N: 16384, r: 8, p: 1});
  return `scrypt$16384$8$1$${salt.toString("hex")}$${hash.toString("hex")}`;
}

const FIRST = ["Ahmed", "Mohammed", "Ali", "Hussain", "Yousef", "Abdulla", "Khalid", "Salman", "Hamad", "Omar", "Faisal", "Ebrahim", "Jassim", "Isa", "Rashid",
  "Fatima", "Maryam", "Zainab", "Noora", "Aisha", "Sara", "Latifa", "Hessa", "Dana", "Reem", "Shaikha", "Amna", "Layla", "Muneera", "Haya"];
const LAST = ["Al Khalifa", "Al Doseri", "Al Sayed", "Nasser", "Al Mahmood", "Al Binali", "Al Mannai", "Al Jishi", "Al Hashimi", "Al Noaimi", "Bucheeri",
  "Al Zayani", "Kanoo", "Al Ansari", "Al Mahroos", "Janahi", "Al Thawadi", "Fakhro", "Al Moayyed", "Al Qassab"];
const pick = (list) => list[randomInt(list.length)];

async function counts() {
  const notDrawn = "id NOT IN (SELECT guest_id FROM grand_prize_draws WHERE guest_id IS NOT NULL)";
  const test = await first(`SELECT COUNT(*) AS total, COUNT(checked_in_at) AS checkedIn FROM guests WHERE notes = :mark`, {mark: MARK});
  return {
    testGuests: Number(test.total),
    testCheckedIn: Number(test.checkedIn),
    allGuests: Number((await first(`SELECT COUNT(*) AS n FROM guests`)).n),
    drawEntries: Number((await first(`SELECT COUNT(*) AS n FROM guests WHERE is_active = 1 AND ${notDrawn}`)).n),
    drawEntriesCheckedIn: Number((await first(`SELECT COUNT(*) AS n FROM guests WHERE is_active = 1 AND checked_in_at IS NOT NULL AND ${notDrawn}`)).n),
  };
}

const auditStatement = (action, details) => ({
  sql: `INSERT INTO audit_log (actor_type, actor_id, actor_name, action, details, created_at) VALUES ('system', NULL, :actor, :action, :details, :now)`,
  args: {actor: ACTOR, action, details, now: new Date().toISOString()},
});

async function add(count) {
  if (!remoteUrl) {
    // Safety copy first (consistent even while the app is running). Turso keeps its own restore points.
    const backupDir = path.join(path.dirname(localFile), "backups");
    fs.mkdirSync(backupDir, {recursive: true});
    const backup = path.join(backupDir, `before-test-guests-${new Date().toISOString().replace(/[:.]/g, "-")}.db`);
    await db.execute(`VACUUM INTO '${backup.replace(/'/g, "''")}'`);
    console.log(`Backup: ${backup}`);
  }

  const passwordHash = hashPassword(PASSWORD); // one shared test password
  const started = Date.now();
  const maxCode = Number((await first(`SELECT MAX(CAST(SUBSTR(code, 3) AS INTEGER)) AS max FROM guests WHERE code LIKE 'G-%'`)).max ?? 1000);
  const maxPhone = Number((await first(`SELECT MAX(CAST(SUBSTR(phone, 5) AS INTEGER)) AS max FROM guests WHERE phone LIKE '+973399%'`)).max ?? 39900000);

  const statements = [];
  let checkedIn = 0;
  let withResults = 0;
  for (let index = 1; index <= count; index += 1) {
    const id = randomUUID();
    const created = new Date(started - randomInt(6 * 3600) * 1000).toISOString(); // spread over the last 6 hours
    const isCheckedIn = randomInt(100) < 85; // most students arrive
    statements.push({
      sql: `INSERT INTO guests (id, code, full_name, phone, email, notes, password_hash, is_active, source, checked_in_at, checked_in_by, created_at, updated_at)
            VALUES (:id, :code, :name, :phone, NULL, :mark, :hash, 1, 'reception', :checkedIn, :checkedInBy, :created, :created)`,
      args: {
        id,
        code: `G-${Math.max(1000, maxCode) + index}`,
        name: `${pick(FIRST)} ${pick(LAST)}`,
        phone: `+973${Math.max(39900000, maxPhone) + index}`,
        mark: MARK,
        hash: passwordHash,
        checkedIn: isCheckedIn ? created : null,
        checkedInBy: isCheckedIn ? "IT Desk" : null,
        created,
      },
    });
    if (isCheckedIn) checkedIn += 1;
    if (isCheckedIn && randomInt(100) < 60) {
      const played = 1 + randomInt(6);
      statements.push({
        sql: `INSERT INTO game_results (guest_id, games_played, games_won, recorded_by, created_at, updated_at) VALUES (:id, :played, :won, 'IT Desk', :now, :now)`,
        args: {id, played, won: randomInt(played + 1), now: created},
      });
      withResults += 1;
    }
  }
  statements.push(auditStatement("guest.testDataAdded", `${count} test guests created (${checkedIn} checked in, ${withResults} with game results)`));
  await db.batch(statements, "write"); // one atomic batch: all or nothing
  console.log(`Created ${count} test guests in ${Date.now() - started} ms — ${checkedIn} checked in, ${withResults} with game results.`);
  console.log(`Guest IDs G-${Math.max(1000, maxCode) + 1} … G-${Math.max(1000, maxCode) + count}, password for all: ${PASSWORD}`);
}

async function remove() {
  const test = `SELECT id FROM guests WHERE notes = :mark`;
  const args = {mark: MARK};
  const n = Number((await first(`SELECT COUNT(*) AS n FROM guests WHERE notes = :mark`, args)).n);
  // Linked rows explicitly (no reliance on foreign-key cascades). Past draws keep code and name.
  await db.batch(
    [
      {sql: `DELETE FROM sessions WHERE subject_type = 'guest' AND subject_id IN (${test})`, args},
      {sql: `DELETE FROM game_results WHERE guest_id IN (${test})`, args},
      {sql: `DELETE FROM attendance WHERE guest_id IN (${test})`, args},
      {sql: `DELETE FROM winner_announcements WHERE guest_id IN (${test})`, args},
      {sql: `DELETE FROM photo_submissions WHERE guest_id IN (${test})`, args},
      {sql: `UPDATE grand_prize_draws SET guest_id = NULL WHERE guest_id IN (${test})`, args},
      {sql: `DELETE FROM guests WHERE notes = :mark`, args},
      auditStatement("guest.testDataRemoved", `${n} test guests removed`),
    ],
    "write",
  );
  console.log(`Removed ${n} test guests.`);
}

const [command = "status", arg] = process.argv.slice(2);
if (command === "add") {
  const count = Number(arg ?? 500);
  if (!Number.isInteger(count) || count < 1 || count > 10000) {
    console.error("Count must be a whole number between 1 and 10000.");
    process.exit(1);
  }
  await add(count);
} else if (command === "remove") {
  await remove();
} else if (command !== "status") {
  console.error("Usage: node scripts/test-guests.mjs add [count] | status | remove");
  process.exit(1);
}
console.table(await counts());
db.close();
