import {NextResponse, type NextRequest} from "next/server";

/**
 * Optimistic gate only: if the session cookie is missing, send the visitor to the
 * right sign-in page with a return path. Real authorization happens server-side
 * in every page (requireStaffPage / requireGuestPage) and every server action.
 */
export function proxy(request: NextRequest) {
  const {pathname, search} = request.nextUrl;
  const next = encodeURIComponent(pathname + search);

  if (pathname.startsWith("/staff") && pathname !== "/staff/login" && !request.cookies.has("nd_staff")) {
    return NextResponse.redirect(new URL(`/staff/login?next=${next}`, request.url));
  }
  if (pathname.startsWith("/guest") && !request.cookies.has("nd_guest")) {
    return NextResponse.redirect(new URL(`/login?next=${next}`, request.url));
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/staff/:path*", "/guest/:path*"],
};
