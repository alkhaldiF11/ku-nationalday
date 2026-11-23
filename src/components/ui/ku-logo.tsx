import Image from "next/image";

import {cn} from "@/lib/utils/cn";

/*
 * Kingdom University brand assets (public/brand), cut from the official logo with
 * transparent backgrounds. "color" is for light surfaces, "white" for dark ones.
 *
 * The display size is passed as a number and written into the width/height
 * attributes (not only CSS classes), so the logo keeps its size even if the
 * stylesheet is stale or slow to load.
 */

const MARK = {w: 235, h: 256};
const LOGO = {w: 674, h: 320};

/** The K shield on its own, `size` px tall. Decorative by default. */
export function KuMark({tone = "color", size = 40, className, alt = ""}: {tone?: "color" | "white"; size?: number; className?: string; alt?: string}) {
  return (
    <Image
      src={tone === "white" ? "/brand/ku-mark-white.webp" : "/brand/ku-mark.webp"}
      width={Math.round((size * MARK.w) / MARK.h)}
      height={size}
      alt={alt}
      aria-hidden={alt ? undefined : true}
      className={cn("shrink-0 select-none", className)}
      style={{height: size, width: "auto"}}
      unoptimized
      priority
    />
  );
}

/** Full bilingual lockup (shield + جامعة المملكة + Kingdom University), `size` px tall. */
export function KuLogo({tone = "color", size = 64, className, alt = "Kingdom University · جامعة المملكة"}: {tone?: "color" | "white"; size?: number; className?: string; alt?: string}) {
  return (
    <Image
      src={tone === "white" ? "/brand/ku-logo-white.webp" : "/brand/ku-logo.webp"}
      width={Math.round((size * LOGO.w) / LOGO.h)}
      height={size}
      alt={alt}
      className={cn("select-none", className)}
      style={{height: size, width: "auto"}}
      unoptimized
    />
  );
}
