import type {Metadata} from "next";
import Link from "next/link";
import {notFound} from "next/navigation";
import {ArrowLeft, Camera} from "lucide-react";

import {GalleryGrid} from "@/components/site/gallery-grid";
import {ButtonLink} from "@/components/ui/button";
import {EmptyState, PageHeader} from "@/components/ui/card";
import {getCurrentGuest} from "@/lib/auth/session";
import {albumExists, listGallery} from "@/lib/data/content";
import {listApprovedGuestPhotos} from "@/lib/data/photos";
import {shareHref, type GalleryItem} from "@/lib/gallery";
import {getI18n} from "@/lib/i18n/server";

type Album = {kind: "guests"} | {kind: "year"; year: number};

/** "/gallery/guests" or "/gallery/2025"; anything else is a 404. */
function parseAlbum(value: string): Album | null {
  if (value === "guests") return {kind: "guests"};
  if (/^\d{4}$/.test(value)) return {kind: "year", year: Number(value)};
  return null;
}

export async function generateMetadata({params}: PageProps<"/gallery/[album]">): Promise<Metadata> {
  const {t} = await getI18n();
  const album = parseAlbum((await params).album);
  if (!album) return {title: t("gallery.title")};
  return {title: album.kind === "guests" ? t("photos.guestCategory") : t("gallery.yearAlbum", {year: album.year})};
}

export default async function AlbumPage({params}: PageProps<"/gallery/[album]">) {
  const album = parseAlbum((await params).album);
  if (!album) notFound();
  const {t} = await getI18n();

  let images: GalleryItem[];
  if (album.kind === "guests") {
    // Approved guest photos only; grouped by the year they were shared, so 2024/2025/2026 chips appear as years accumulate.
    images = (await listApprovedGuestPhotos()).map((photo) => ({...photo, category: photo.createdAt.slice(0, 4)}));
  } else {
    // Albums exist before they have photos; only years that aren't albums are 404s.
    if (!await albumExists(album.year)) notFound();
    images = (await listGallery({year: album.year})).map(({id, title, caption, category, src, createdAt}) => ({id, title, caption, category, src, createdAt}));
  }
  const guest = album.kind === "guests" ? await getCurrentGuest() : null;

  return (
    <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6">
      <Link href="/gallery" className="mb-4 inline-flex items-center gap-1.5 text-sm font-semibold text-muted hover:text-ink">
        <ArrowLeft className="size-4 rtl:-scale-x-100" aria-hidden />
        {t("gallery.allAlbums")}
      </Link>
      <PageHeader
        eyebrow={t("gallery.title")}
        title={album.kind === "guests" ? t("photos.guestCategory") : t("gallery.yearAlbum", {year: album.year})}
        description={album.kind === "guests" ? t("gallery.guestSubtitle") : t("gallery.officialSubtitle")}
        action={
          album.kind === "guests" ? (
            <ButtonLink href={shareHref(Boolean(guest))}>
              <Camera className="size-4" aria-hidden />
              {t("photos.share")}
            </ButtonLink>
          ) : undefined
        }
      />
      {images.length ? <GalleryGrid images={images} /> : <EmptyState title={album.kind === "guests" ? t("gallery.guestEmpty") : t("gallery.albumEmpty")} />}
    </div>
  );
}
