import {readFile} from "@/lib/storage";

/** Serves official gallery images from storage. File names are server-generated; anything else is rejected. */
export async function GET(_request: Request, ctx: RouteContext<"/media/[file]">) {
  const {file} = await ctx.params;
  if (!/^[A-Za-z0-9-]+\.(jpg|png|webp|svg)$/.test(file)) {
    return new Response("Not found", {status: 404});
  }
  const stored = await readFile(`uploads/${file}`);
  if (!stored) {
    return new Response("Not found", {status: 404});
  }
  return new Response(stored.body, {
    headers: {
      "Content-Type": stored.contentType,
      // Names are unique per upload, so the browser and CDN may cache them forever.
      "Cache-Control": "public, max-age=31536000, immutable",
      "X-Content-Type-Options": "nosniff",
      // SVGs are only ever written by the seed, but sandbox them anyway.
      "Content-Security-Policy": "default-src 'none'; style-src 'unsafe-inline'; sandbox",
    },
  });
}
