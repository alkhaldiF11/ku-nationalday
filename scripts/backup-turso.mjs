#!/usr/bin/env node
/**
 * Saves every table of the live Turso database to a JSON file in data/backups/ (rows as objects).
 *   node --env-file=.env.vercel scripts/backup-turso.mjs
 */
import fs from "node:fs";
import path from "node:path";

import {createClient} from "@libsql/client";

const client = createClient({url: process.env.TURSO_DATABASE_URL, authToken: process.env.TURSO_AUTH_TOKEN});
const tables = (await client.execute(`SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%' ORDER BY name`)).rows.map((row) => String(row.name));
const dump = {takenAt: new Date().toISOString(), tables: {}};
for (const table of tables) {
  const result = await client.execute(`SELECT * FROM "${table}"`);
  dump.tables[table] = result.rows.map((row) => Object.fromEntries(result.columns.map((column, index) => [column, row[index]])));
  console.log(`${table.padEnd(22)} ${dump.tables[table].length}`);
}
fs.mkdirSync("data/backups", {recursive: true});
const file = path.join("data/backups", `turso-${dump.takenAt.replace(/[:.]/g, "-")}.json`);
fs.writeFileSync(file, JSON.stringify(dump));
console.log(`Saved ${file} (${Math.round(fs.statSync(file).size / 1024)} KB)`);
client.close();
