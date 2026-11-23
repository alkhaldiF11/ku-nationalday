import {cn} from "@/lib/utils/cn";

/**
 * Bahrain flag: white hoist, five white serrations into red (3:5 proportions).
 *
 * Sizing never depends on the stylesheet (an SVG without its own size expands to
 * fill its container if CSS is missing or stale):
 * - `width` renders a fixed-size flag, height derived from the 3:5 ratio;
 * - `cover` fills the positioned parent, cropping like background-size: cover.
 */
export function FlagMark({className, title, cover = false, width = 40}: {className?: string; title?: string; cover?: boolean; width?: number}) {
  const points = ["0,0", "25,0"];
  for (let index = 0; index < 5; index += 1) {
    points.push(`40,${6 + index * 12}`, `25,${12 + index * 12}`);
  }
  points.push("0,60");
  const height = Math.round(width * 0.6);
  return (
    <svg
      viewBox="0 0 100 60"
      preserveAspectRatio={cover ? "xMinYMid slice" : undefined}
      width={cover ? undefined : width}
      height={cover ? undefined : height}
      style={cover ? {position: "absolute", inset: 0, width: "100%", height: "100%"} : {width, height, flexShrink: 0}}
      className={cn("block", className)}
      role={title ? "img" : undefined}
      aria-label={title}
      aria-hidden={title ? undefined : true}
    >
      <rect width="100" height="60" fill="#ce1126" />
      <polygon points={points.join(" ")} fill="#fff" />
    </svg>
  );
}
