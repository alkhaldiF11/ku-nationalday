import Image from "next/image";

import {AlbumCreator, DeleteAlbum, DeleteImage, ImageEditor} from "@/components/staff/admin/content-admin";
import {BulkImageUploader as ImageUploader} from "@/components/staff/admin/bulk-image-uploader";
import {Badge, EmptyState, PageHeader} from "@/components/ui/card";
import {requireStaffPage} from "@/lib/auth/guards";
import {getSettings, listGallery, listGalleryAlbums, listGalleryCategories} from "@/lib/data/content";
import {formatNumber, relativeTime} from "@/lib/i18n/core";
import {getI18n} from "@/lib/i18n/server";

export default async function GalleryAdminPage() {
  await requireStaffPage(["admin"]);
  const {t, locale} = await getI18n();
  const albums = await listGalleryAlbums(); // every yearly folder, including empty ones
  const albumYears = albums.map((album) => album.year);
  const images = Map.groupBy(await listGallery(), (image) => image.albumYear);
  const categories = await listGalleryCategories();
  const eventYear = Number((await getSettings()).eventDate.slice(0, 4));
  const defaultYear = albumYears.includes(eventYear) ? eventYear : (albumYears[0] ?? eventYear);
  const suggestedYear = albumYears.length ? Math.min(...albumYears) - 1 : eventYear;

  return (
    <div>
      <PageHeader
        eyebrow={t("staff.sections.manage")}
        title={t("staff.gallery.title")}
        description={t("staff.gallery.lede")}
        action={
          <>
            <AlbumCreator suggestedYear={suggestedYear} />
            {albumYears.length ? <ImageUploader categories={categories} albums={albumYears} defaultYear={defaultYear} /> : null}
          </>
        }
      />
      {albums.length ? (
        <div className="space-y-10">
          {albums.map((album) => {
            const items = images.get(album.year) ?? [];
            return (
              <section key={album.year} aria-labelledby={`album-${album.year}`}>
                <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                  <h2 id={`album-${album.year}`} className="flex items-baseline gap-3 text-lg font-bold">
                    {t("gallery.yearAlbum", {year: album.year})}
                    <span className="text-sm font-semibold text-muted">{album.count ? t("gallery.photoCount", {count: formatNumber(locale, album.count)}) : t("gallery.noPhotos")}</span>
                  </h2>
                  {!items.length ? <DeleteAlbum year={album.year} /> : null}
                </div>
                {items.length ? (
                  <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                    {items.map((image) => (
                      <li key={image.id} className="overflow-hidden rounded-3xl bg-card ring-1 ring-line shadow-[var(--shadow-card)]">
                        <div className="relative aspect-[3/2] bg-paper-deep">
                          <Image src={image.src} alt={image.title} fill sizes="(min-width: 1280px) 33vw, (min-width: 640px) 50vw, 100vw" className="object-cover" unoptimized />
                        </div>
                        <div className="flex items-start justify-between gap-2 p-4">
                          <div className="min-w-0">
                            <p className="truncate font-bold">{image.title}</p>
                            <p className="mt-0.5 text-xs text-muted">
                              {t("staff.gallery.by", {name: image.uploadedBy})} · {relativeTime(locale, image.createdAt)}
                            </p>
                            <Badge className="mt-2">{image.category}</Badge>
                          </div>
                          <div className="flex shrink-0">
                            <ImageEditor image={image} albums={albumYears} />
                            <DeleteImage image={image} />
                          </div>
                        </div>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <EmptyState title={t("staff.gallery.albumEmpty")}>
                    <div className="mt-3">
                      <ImageUploader categories={categories} albums={albumYears} defaultYear={album.year} label={t("staff.gallery.uploadToAlbum", {year: album.year})} />
                    </div>
                  </EmptyState>
                )}
              </section>
            );
          })}
        </div>
      ) : (
        <EmptyState title={t("staff.gallery.empty")} />
      )}
    </div>
  );
}
