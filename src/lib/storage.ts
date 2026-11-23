import fs from "node:fs/promises";
import path from "node:path";

import {del, get, put} from "@vercel/blob";

import {resolveDataDir} from "@/lib/db";

/*
 * File storage for photos. One API, two backends:
 *  - Production (Vercel): Vercel Blob, every file PRIVATE (needs BLOB_READ_WRITE_TOKEN, which
 *    Vercel adds when a Blob store is connected). Files are only reachable through this app's
 *    routes (/media/[file], /photos/[id]), which decide who may see what.
 *  - Development & tests: folders under DATA_DIR.
 *
 * Keys look like "uploads/<file>" (official gallery) or "private/submissions/<file>"
 * (guest photos). Callers build keys only from server-generated names.
 */

const KEY_PATTERN = /^(uploads|private\/submissions)\/[A-Za-z0-9-]+\.(jpg|png|webp|svg)$/;

const CONTENT_TYPES: Record<string, string> = {
  jpg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  svg: "image/svg+xml",
};

const blobConfigured = () => Boolean(process.env.BLOB_READ_WRITE_TOKEN);

function checkKey(key: string) {
  if (!KEY_PATTERN.test(key)) {
    throw new Error(`Invalid storage key: ${key}`);
  }
}

export const contentTypeOf = (key: string) => CONTENT_TYPES[key.split(".").pop() ?? ""] ?? "application/octet-stream";

const localPath = (key: string) => path.join(resolveDataDir(), ...key.split("/"));

export async function putFile(key: string, bytes: Uint8Array | string) {
  checkKey(key);
  const body = typeof bytes === "string" ? Buffer.from(bytes, "utf8") : Buffer.from(bytes);
  if (blobConfigured()) {
    await put(key, body, {access: "private", contentType: contentTypeOf(key), addRandomSuffix: false, allowOverwrite: true});
    return;
  }
  const file = localPath(key);
  await fs.mkdir(path.dirname(file), {recursive: true});
  await fs.writeFile(file, body);
}

/** The file's contents as a response body, or null if it doesn't exist. */
export async function readFile(key: string): Promise<{body: BodyInit; contentType: string} | null> {
  checkKey(key);
  if (blobConfigured()) {
    const result = await get(key, {access: "private"}).catch(() => null);
    return result?.stream ? {body: result.stream, contentType: contentTypeOf(key)} : null;
  }
  try {
    return {body: new Uint8Array(await fs.readFile(localPath(key))), contentType: contentTypeOf(key)};
  } catch {
    return null;
  }
}

/** Removes a file; a missing file is not an error (the record matters more than the bytes). */
export async function removeFile(key: string) {
  checkKey(key);
  try {
    if (blobConfigured()) {
      await del(key);
    } else {
      await fs.rm(localPath(key), {force: true});
    }
  } catch (error) {
    console.error(`Could not remove ${key}`, error);
  }
}
