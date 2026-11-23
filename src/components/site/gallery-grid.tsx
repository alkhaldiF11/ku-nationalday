"use client";

import Image from "next/image";
import {ChevronLeft, ChevronRight, X} from "lucide-react";
import {useCallback, useEffect, useMemo, useRef, useState} from "react";

import type {GalleryItem} from "@/lib/gallery";
import {useI18n} from "@/lib/i18n/client";
import {cn} from "@/lib/utils/cn";

export function GalleryGrid({images}: {images: GalleryItem[]}) {
  const {t} = useI18n();
  // Guest photos may have no title: fall back to "Guest photo" (never the guest's name).
  const titleOf = (image: GalleryItem) => image.title || (image.fromGuest ? t("photos.guestPhoto") : "");
  const [category, setCategory] = useState<string | null>(null);
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  const categories = useMemo(() => [...new Set(images.map((image) => image.category))].sort(), [images]);
  const visible = useMemo(() => (category ? images.filter((image) => image.category === category) : images), [images, category]);

  const step = useCallback((delta: number) => setOpenIndex((index) => (index === null ? null : (index + delta + visible.length) % visible.length)), [visible.length]);

  useEffect(() => {
    if (openIndex === null) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpenIndex(null);
      const rtl = document.documentElement.dir === "rtl";
      if (event.key === "ArrowRight") step(rtl ? -1 : 1);
      if (event.key === "ArrowLeft") step(rtl ? 1 : -1);
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [openIndex, step]);

  const current = openIndex === null ? null : visible[openIndex];

  // Swipe left/right between photos (direction follows the page: in Arabic, swiping right goes forward).
  const touchStart = useRef<{x: number; y: number} | null>(null);
  const onTouchStart = (event: React.TouchEvent) => {
    touchStart.current = {x: event.touches[0].clientX, y: event.touches[0].clientY};
  };
  const onTouchEnd = (event: React.TouchEvent) => {
    const start = touchStart.current;
    touchStart.current = null;
    if (!start) return;
    const dx = event.changedTouches[0].clientX - start.x;
    const dy = event.changedTouches[0].clientY - start.y;
    if (Math.abs(dx) < 50 || Math.abs(dx) < Math.abs(dy)) return;
    const rtl = document.documentElement.dir === "rtl";
    step(dx < 0 === !rtl ? 1 : -1);
  };

  return (
    <>
      {categories.length > 1 ? (
        <div className="-mx-5 mb-4 flex gap-2 overflow-x-auto px-5 pb-1 sm:mx-0 sm:mb-6 sm:flex-wrap sm:px-0" role="group" aria-label={t("common.filter")}>
          {[null, ...categories].map((item) => (
            <button
              key={item ?? "all"}
              type="button"
              aria-pressed={category === item}
              onClick={() => setCategory(item)}
              className={cn(
                "inline-flex h-10 shrink-0 items-center rounded-full px-4 text-sm font-semibold ring-1 transition",
                category === item ? "bg-ink text-white ring-ink" : "bg-card text-ink-soft ring-line hover:ring-ink/30",
              )}
            >
              {item ?? t("gallery.allCategories")}
            </button>
          ))}
        </div>
      ) : null}

      <ul className="columns-2 gap-2.5 sm:gap-4 lg:columns-3">
        {visible.map((image, index) => (
          <li key={image.id} className="mb-2.5 break-inside-avoid sm:mb-4">
            <button
              type="button"
              onClick={() => setOpenIndex(index)}
              className="group block w-full overflow-hidden rounded-2xl bg-card text-start ring-1 ring-line sm:rounded-3xl"
              aria-label={t("gallery.openImage", {title: titleOf(image)})}
            >
              <span className="relative block aspect-square overflow-hidden bg-paper-deep sm:aspect-[3/2]">
                <Image src={image.src} alt="" fill sizes="(min-width: 1024px) 33vw, 50vw" className="object-cover transition duration-500 group-hover:scale-105" unoptimized />
              </span>
              <span className="block p-2.5 sm:p-4">
                <span className="line-clamp-2 block text-[13px] font-bold text-ink sm:text-base" dir="auto">{titleOf(image)}</span>
                {image.caption ? <span className="mt-0.5 line-clamp-2 hidden text-sm text-muted sm:block" dir="auto">{image.caption}</span> : null}
                <span className="mt-2 hidden rounded-full sm:inline-block bg-paper-deep px-2.5 py-0.5 text-xs font-semibold text-ink-soft">{image.category}</span>
              </span>
            </button>
          </li>
        ))}
      </ul>

      {current ? (
        <div
          className="fixed inset-0 z-50 flex animate-rise flex-col bg-night/95 px-4 pt-[max(1rem,env(safe-area-inset-top))] pb-[max(1rem,env(safe-area-inset-bottom))] text-white"
          role="dialog"
          aria-modal="true"
          aria-label={titleOf(current)}
          onTouchStart={onTouchStart}
          onTouchEnd={onTouchEnd}
        >
          <div className="flex items-center justify-between gap-4">
            <p className="min-w-0 text-sm font-semibold sm:text-base">
              {titleOf(current)}
              {current.caption ? <span className="ms-2 font-normal text-white/60">{current.caption}</span> : null}
            </p>
            <button type="button" onClick={() => setOpenIndex(null)} className="grid size-11 shrink-0 place-items-center rounded-xl hover:bg-white/10" aria-label={t("common.close")} autoFocus>
              <X className="size-6" />
            </button>
          </div>
          <div className="relative my-4 flex-1">
            <Image src={current.src} alt={titleOf(current)} fill sizes="100vw" className="object-contain" unoptimized />
          </div>
          {visible.length > 1 ? (
            <div className="flex items-center justify-center gap-4">
              <button type="button" onClick={() => step(-1)} className="grid size-12 place-items-center rounded-xl bg-white/10 hover:bg-white/20" aria-label={t("common.previous")}>
                <ChevronLeft className="size-5 rtl:-scale-x-100" />
              </button>
              <span className="tabular min-w-14 text-center text-sm text-white/70">
                {(openIndex ?? 0) + 1} / {visible.length}
              </span>
              <button type="button" onClick={() => step(1)} className="grid size-12 place-items-center rounded-xl bg-white/10 hover:bg-white/20" aria-label={t("common.next")}>
                <ChevronRight className="size-5 rtl:-scale-x-100" />
              </button>
            </div>
          ) : null}
        </div>
      ) : null}
    </>
  );
}
