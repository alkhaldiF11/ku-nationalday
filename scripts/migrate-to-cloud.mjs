#!/usr/bin/env node
/**
 * One-time move of the local event data to the cloud services used on Vercel:
 *   data/nationalday.db                   → Turso   (TURSO_DATABASE_URL, TURSO_AUTH_TOKEN)
 *   data/uploads, data/private/submissions → Vercel Blob, private (BLOB_READ_WRITE_TOKEN)
 *
 *   node --env-file=.env.vercel scripts/migrate-to-cloud.mjs            copy (target must be empty)
 *   node --env-file=.env.vercel scripts/migrate-to-cloud.mjs --replace  wipe the target's rows first
 *                                                                      (e.g. demo data the site
 *                                                                      created on its first visit)
 *
 * Sign-in sessions and login-attempt counters are not copied: everyone signs in again.
 * Re-running is safe: files are overwritten, and --replace starts the rows over.
 */
import fs from "node:fs";
import path from "node:path";
import {pathToFileURL} from "node:url";

import {createClient} from "@libsql/client";
import {put} from "@vercel/blob";

import {migrate} from "../src/lib/db/schema.ts";

const replace = process.argv.includes("--replace");
const dataDir = path.resolve(process.env.DATA_DIR ?? "data");
const localFile = path.join(dataDir, "nationalday.db");

const missing = ["TURSO_DATABASE_URL", "TURSO_AUTH_TOKEN", "BLOB_READ_WRITE_TOKEN"].filter((name) => !process.env[name]);
if (missing.length) {
  console.error(`Missing ${missing.join(", ")}. Run "vercel env pull .env.vercel" first, then pass --env-file=.env.vercel. (Not .env.local: Next.js loads that one automatically, which would point local runs at the live database.)`);
  process.exit(1);
}
if (!fs.existsSync(localFile)) {
  console.error(`No local database at ${localFile}.`);
  process.exit(1);
}

const local = createClient({url: pathToFileURL(localFile).href});
const remote = createClient({url: process.env.TURSO_DATABASE_URL, authToken: process.env.TURSO_AUTH_TOKEN});

/* Parent tables before the tables that point at them. */
const TABLES = [
  "settings",
  "staff_users",
  "guests",
  "activities",
  "announcements",
  "gallery_albums",
  "gallery_images",
  "photo_submissions",
  "game_results",
  "grand_prize_draws",
  "audit_log",
];

const count = async (client, table) => Number((await client.execute(`SELECT COUNT(*) AS n FROM ${table}`)).rows[0].n);

// 1. Same schema on both sides.
await migrate(local);
await migrate(remote);
const localVersion = (await local.execute("SELECT MAX(version) AS v FROM schema_migrations")).rows[0].v;
const remoteVersion = (await remote.execute("SELECT MAX(version) AS v FROM schema_migrations")).rows[0].v;
if (Number(localVersion) !== Number(remoteVersion)) {
  console.error(`Schema versions differ (local ${localVersion}, Turso ${remoteVersion}).`);
  process.exit(1);
}

// 2. Refuse to mix with existing data unless asked.
// (A fresh database already has the default album folders from the migrations; those don't count.)
const existing = (await Promise.all(TABLES.filter((table) => table !== "gallery_albums").map(async (table) => [table, await count(remote, table)]))).filter(([, n]) => n > 0);
if (existing.length && !replace) {
  console.error(`Turso already has data (${existing.map(([t, n]) => `${t}: ${n}`).join(", ")}).`);
  console.error("Re-run with --replace to wipe it and copy the local data.");
  process.exit(1);
}

// 3. Copy rows (one atomic batch per table chunk; the wipe happens first, children before parents).
if (replace) {
  await remote.batch(
    ["sessions", "login_attempts", ...[...TABLES].reverse()].map((table) => `DELETE FROM ${table}`),
    "write",
  );
  console.log("Cleared existing Turso rows.");
} else {
  await remote.execute("DELETE FROM gallery_albums"); // only the migration defaults; copied below
}
for (const table of TABLES) {
  const result = await local.execute(`SELECT * FROM ${table}`);
  const columns = result.columns;
  const insert = `INSERT INTO ${table} (${columns.join(", ")}) VALUES (${columns.map(() => "?").join(", ")})`;
  const statements = result.rows.map((row) => ({sql: insert, args: columns.map((_, index) => row[index])}));
  for (let start = 0; start < statements.length; start += 200) {
    await remote.batch(statements.slice(start, start + 200), "write");
  }
  const copied = await count(remote, table);
  console.log(`${table.padEnd(18)} ${String(result.rows.length).padStart(5)} rows → Turso has ${copied}`);
  if (copied !== result.rows.length) {
    console.error(`Row count mismatch in ${table}.`);
    process.exit(1);
  }
}

// 4. Photos → private Vercel Blob (same keys the app uses: uploads/… and private/submissions/…).
const TYPES = {".jpg": "image/jpeg", ".png": "image/png", ".webp": "image/webp", ".svg": "image/svg+xml"};
let uploaded = 0;
let bytes = 0;
for (const folder of ["uploads", "private/submissions"]) {
  const dir = path.join(dataDir, ...folder.split("/"));
  if (!fs.existsSync(dir)) continue;
  for (const name of fs.readdirSync(dir)) {
    const type = TYPES[path.extname(name).toLowerCase()];
    if (!type || !/^[A-Za-z0-9-]+\.[a-z]+$/.test(name)) continue;
    const body = fs.readFileSync(path.join(dir, name));
    await put(`${folder}/${name}`, body, {access: "private", contentType: type, addRandomSuffix: false, allowOverwrite: true});
    uploaded += 1;
    bytes += body.length;
    process.stdout.write(`\rPhotos uploaded: ${uploaded}`);
  }
}
console.log(`\rPhotos uploaded: ${uploaded} (${(bytes / 1024 / 1024).toFixed(1)} MB)`);

local.close();
remote.close();
console.log("Done. Open the site and sign in again (sessions are not copied).");
