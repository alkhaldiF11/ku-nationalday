import fs from "node:fs";
import path from "node:path";
import {AsyncLocalStorage} from "node:async_hooks";
import {randomUUID} from "node:crypto";
import {pathToFileURL} from "node:url";

import {createClient, type Client, type InValue, type ResultSet, type Transaction} from "@libsql/client";

import {migrate} from "@/lib/db/schema";
import {seedDatabase} from "@/lib/db/seed";

/*
 * Database access. One API, two backends:
 *  - Production (Vercel): Turso, a hosted SQLite-compatible database — set TURSO_DATABASE_URL
 *    (libsql://…) and TURSO_AUTH_TOKEN (the names Turso's Vercel integration uses).
 *  - Development & tests: a local SQLite file (DATA_DIR/nationalday.db), or DATABASE_PATH.
 */

declare global {
  var __nationalDayDb: Promise<Client> | undefined;
}

export type Params = Record<string, InValue>;
type Executor = Client | Transaction;

export function resolveDataDir() {
  return path.resolve(/*turbopackIgnore: true*/ process.cwd(), process.env.DATA_DIR ?? "data");
}

function connectionConfig(): {url: string; authToken?: string} {
  const remote = process.env.TURSO_DATABASE_URL ?? process.env.DATABASE_URL;
  if (remote) {
    return {url: remote, authToken: process.env.TURSO_AUTH_TOKEN ?? process.env.DATABASE_AUTH_TOKEN};
  }
  const configured = process.env.DATABASE_PATH;
  if (configured === ":memory:") {
    return {url: ":memory:"};
  }
  const file = path.resolve(/*turbopackIgnore: true*/ configured ?? path.join(resolveDataDir(), "nationalday.db"));
  fs.mkdirSync(path.dirname(file), {recursive: true});
  return {url: pathToFileURL(file).href};
}

async function open(): Promise<Client> {
  const config = connectionConfig();
  const client = createClient(config);
  if (config.url.startsWith("file:")) {
    // Local file: WAL lets readers continue while a request writes.
    await client.execute("PRAGMA journal_mode = WAL");
  }
  // The shared promise isn't resolved yet, so startup queries run on this client directly.
  await withClient(client, async () => {
    await migrate(client);
    await seedDatabase();
  });
  return client;
}

/** Shared client, cached on globalThis so dev hot-reloads (and warm serverless instances) reuse it. */
export function getDb(): Promise<Client> {
  if (!globalThis.__nationalDayDb) {
    const opening = open();
    globalThis.__nationalDayDb = opening;
    // A failed start (e.g. database unreachable) must not be cached forever.
    opening.catch(() => {
      if (globalThis.__nationalDayDb === opening) globalThis.__nationalDayDb = undefined;
    });
  }
  return globalThis.__nationalDayDb;
}

/** Test helper: drop the cached client so the next query starts on a fresh database. */
export async function resetDb() {
  const current = globalThis.__nationalDayDb;
  globalThis.__nationalDayDb = undefined;
  if (current) {
    (await current.catch(() => null))?.close();
  }
}

/* The open transaction (if any) for the current async call chain. */
const activeTx = new AsyncLocalStorage<Transaction>();

/** During startup (migrations/seed) the client isn't published yet; seed runs on this one. */
const bootstrap = new AsyncLocalStorage<Client>();

async function executor(): Promise<Executor> {
  return activeTx.getStore() ?? bootstrap.getStore() ?? (await getDb());
}

/** Runs startup work against a client before it is shared (see open()). */
export function withClient<T>(client: Client, fn: () => Promise<T>) {
  return bootstrap.run(client, fn);
}

/**
 * Runs `fn` atomically (a write transaction). Every query inside — including in called
 * functions — joins it automatically. Nested calls join the outer transaction.
 * Never start queries in parallel (Promise.all) inside a transaction.
 */
export async function transaction<T>(fn: () => Promise<T>): Promise<T> {
  if (activeTx.getStore()) {
    return fn();
  }
  const client = bootstrap.getStore() ?? (await getDb());
  const tx = await client.transaction("write");
  try {
    const result = await activeTx.run(tx, fn);
    await tx.commit();
    return result;
  } catch (error) {
    await tx.rollback().catch(() => undefined);
    throw error;
  } finally {
    tx.close();
  }
}

function toObjects<T>(result: ResultSet): T[] {
  return result.rows.map((row) => Object.fromEntries(result.columns.map((column, index) => [column, row[index]])) as T);
}

export async function many<T>(sql: string, params: Params = {}): Promise<T[]> {
  return toObjects<T>(await (await executor()).execute({sql, args: params}));
}

export async function one<T>(sql: string, params: Params = {}): Promise<T | null> {
  return (await many<T>(sql, params))[0] ?? null;
}

export async function run(sql: string, params: Params = {}): Promise<{changes: number}> {
  const result = await (await executor()).execute({sql, args: params});
  return {changes: result.rowsAffected};
}

export const newId = () => randomUUID();
export const nowIso = () => new Date().toISOString();
