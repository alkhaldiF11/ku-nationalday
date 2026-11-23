import type {Metadata} from "next";
import {Camera} from "lucide-react";

import {AlbumCard} from "@/components/site/album-card";
import {ButtonLink} from "@/components/ui/button";
import {EmptyState, PageHeader} from "@/components/ui/card";
import {getCurrentGuest} from "@/lib/auth/session";
import {listGalleryAlbums} from "@/lib/data/content";
import {listApprovedGuestPhotos} from "@/lib/data/photos";
import {shareHref} from "@/lib/gallery";
import {formatNumber} from "@/lib/i18n/core";
import {getI18n} from "@/lib/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  const {t} = await getI18n();
  return {title: t("gallery.title")};
}


/** Gallery index: one folder per year of official photos, plus a separate folder for guest photos. */
export default async function GalleryPage() {
  const {t, locale} = await getI18n();
  const guest = await getCurrentGuest();
  const albums = await listGalleryAlbums();
  const guestPhotos = await listApprovedGuestPhotos(); // approved only — pending/rejected are never listed

  return (
    <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6">
      <PageHeader
        eyebrow={t("brand.event")}
        title={t("gallery.title")}
        description={t("gallery.indexLede")}
        action={
          <ButtonLink href={shareHref(Boolean(guest))}>
            <Camera className="size-4" aria-hidden />
            {t("photos.share")}
          </ButtonLink>
        }
      />

      {albums.length ? (
        <section>
          <h2 className="mb-4 text-sm font-bold tracking-wide text-muted uppercase">{t("gallery.officialAlbums")}</h2>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {albums.map((album) => (
              <AlbumCard
                key={album.year}
                href={`/gallery/${album.year}`}
                title={t("gallery.yearAlbum", {year: album.year})}
                subtitle={album.count ? t("gallery.officialSubtitle") : t("gallery.albumEmpty")}
                count={album.count ? t("gallery.photoCount", {count: formatNumber(locale, album.count)}) : t("gallery.noPhotos")}
                cover={album.cover}
              />
            ))}
          </div>
        </section>
      ) : null}

      <section className="mt-12">
        <h2 className="mb-4 text-sm font-bold tracking-wide text-muted uppercase">{t("photos.guestCategory")}</h2>
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          <AlbumCard
            href="/gallery/guests"
            variant="guests"
            title={t("photos.guestCategory")}
            subtitle={t("gallery.guestSubtitle")}
            count={guestPhotos.length ? t("gallery.photoCount", {count: formatNumber(locale, guestPhotos.length)}) : t("gallery.noPhotos")}
            cover={guestPhotos[0]?.src ?? null}
          />
        </div>
      </section>

      {!albums.length && !guestPhotos.length ? <EmptyState className="mt-8" title={t("gallery.empty")} /> : null}
    </div>
  );
}
