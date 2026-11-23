import Image from "next/image";
import Link from "next/link";
import {Camera, FolderOpen, ImageOff} from "lucide-react";

import {cn} from "@/lib/utils/cn";

/** A folder-style card on the gallery index: cover photo, name and photo count. */
export function AlbumCard({href, title, subtitle, count, cover, variant = "year"}: {href: string; title: string; subtitle: string; count: string; cover: string | null; variant?: "year" | "guests"}) {
  const Icon = variant === "guests" ? Camera : FolderOpen;
  return (
    <Link
      href={href}
      className={cn(
        "group relative block overflow-hidden rounded-3xl bg-card ring-1 shadow-[var(--shadow-card)] transition hover:-translate-y-0.5 hover:shadow-[var(--shadow-lift)]",
        variant === "guests" ? "ring-crimson/30" : "ring-line",
      )}
    >
      {/* Stacked "folder" edge behind the cover */}
      <span className="absolute inset-x-6 top-2 h-4 rounded-t-2xl bg-paper-deep" aria-hidden />
      <span className="relative mt-3 block aspect-[4/3] overflow-hidden rounded-t-3xl bg-paper-deep">
        {cover ? (
          <Image src={cover} alt="" fill sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw" className="object-cover transition duration-500 group-hover:scale-105" unoptimized />
        ) : (
          <span className="grid size-full place-items-center text-muted">
            <ImageOff className="size-8" aria-hidden />
          </span>
        )}
        <span className="absolute inset-0 bg-gradient-to-t from-night/70 via-night/10 to-transparent" aria-hidden />
        <span className={cn("absolute start-4 top-4 grid size-10 place-items-center rounded-xl text-white shadow-lg", variant === "guests" ? "bg-crimson" : "bg-night/70 backdrop-blur")}>
          <Icon className="size-5" aria-hidden />
        </span>
        <span className="absolute inset-x-4 bottom-4 text-white">
          <span className="block font-display text-2xl font-semibold">{title}</span>
          <span className="block text-sm text-white/80">{count}</span>
        </span>
      </span>
      <span className="block px-4 py-3 text-sm text-muted">{subtitle}</span>
    </Link>
  );
}
