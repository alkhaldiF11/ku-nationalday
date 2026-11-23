import {getCurrentGuest, getCurrentStaff} from "@/lib/auth/session";
import {readPhotoForViewer} from "@/lib/data/photos";

/**
 * The only way to read a guest photo submission. Approved photos are public;
 * pending/rejected ones only for their owner or an administrator. Everything else
 * is a 404, so the existence of unapproved photos is never revealed.
 */
export async function GET(_request: Request, ctx: RouteContext<"/photos/[id]">) {
  const {id} = await ctx.params;
  const [guest, staff] = await Promise.all([getCurrentGuest(), getCurrentStaff()]);
  const photo = await readPhotoForViewer(id, {guestId: guest?.id ?? null, isAdmin: staff?.role === "admin"});
  if (!photo) {
    return new Response("Not found", {status: 404, headers: {"Cache-Control": "no-store"}});
  }
  return new Response(photo.body, {
    headers: {
      "Content-Type": photo.contentType,
      // Unapproved photos must never be stored by shared caches.
      // Short public cache so an un-approved/deleted photo disappears quickly.
      "Cache-Control": photo.isPublic ? "public, max-age=60" : "private, no-store",
      "X-Content-Type-Options": "nosniff",
      "Content-Security-Policy": "default-src 'none'; sandbox",
    },
  });
}
