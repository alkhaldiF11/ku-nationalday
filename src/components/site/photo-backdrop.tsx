import Image from "next/image";

import {cn} from "@/lib/utils/cn";

/**
 * Faded Bahrain backdrop (fort, dhow and the World Trade Center under a pale sky), washed into
 * the paper tone. The image is portrait with open sky at the top, so text placed over the upper
 * part never covers the landmarks. Place inside a `relative` container.
 */
export function PhotoBackdrop({opacity = 0.5, className}: {opacity?: number; className?: string}) {
  return (
    <div className={cn("pointer-events-none absolute inset-0 overflow-hidden", className)} aria-hidden>
      <Image src="/images/hero-bahrain.webp" alt="" fill priority sizes="100vw" unoptimized className="object-cover object-[70%_70%]" style={{opacity}} />
      <div className="absolute inset-0 bg-gradient-to-b from-paper/70 via-paper/40 to-paper" />
    </div>
  );
}
