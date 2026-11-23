/** Shared (client-safe) gallery types and constants. */

export type GalleryItem = {
  id: string;
  title: string | null;
  caption: string | null;
  category: string;
  src: string;
  /** True for guest-shared photos. Who shared them is never included — that's admin-only. */
  fromGuest?: boolean;
  createdAt: string;
};

/** Where "Share your photos" leads: the upload page, or sign-in first (then back to it). */
export const shareHref = (signedIn: boolean) => (signedIn ? "/guest/photos" : "/login?next=%2Fguest%2Fphotos");
