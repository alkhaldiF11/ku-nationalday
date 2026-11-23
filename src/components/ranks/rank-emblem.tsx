"use client";

import {useId} from "react";

import type {Rank} from "@/lib/ranks";

/*
 * Premium 3D rank emblem: a bevelled metallic shield with a faceted star and a laurel wreath.
 * Depth comes from layered gradients (rim bevel, face, inner shadow, gloss), a two-tone faceted
 * star, and a soft cast shadow — not a flat icon. All four ranks share the construction and
 * differ only in palette, so they read as one family. Crystal adds glass transparency,
 * refraction lines, luminous edges and sparkles.
 */

type Palette = {
  rim: [string, string, string, string]; // highlight → light → mid → shadow (bevel)
  face: [string, string, string]; // top → middle → bottom
  star: [string, string]; // lit facet, shaded facet
  leaf: [string, string];
  glow: string;
  faceOpacity?: number;
};

export const RANK_PALETTES: Record<Rank, Palette> = {
  silver: {rim: ["#ffffff", "#e3e7ec", "#a7afb9", "#5d6570"], face: ["#f7f9fb", "#c8ced6", "#89929d"], star: ["#ffffff", "#a9b1bb"], leaf: ["#eef1f4", "#7f8893"], glow: "#cfd5dc"},
  gold: {rim: ["#fffbe6", "#f9dc85", "#d39a2c", "#7a4b08"], face: ["#fff1bf", "#e9b649", "#a86d14"], star: ["#fff8d9", "#d49526"], leaf: ["#fbe39a", "#9c6512"], glow: "#f3d27a"},
  platinum: {rim: ["#ffffff", "#dceaf3", "#90aec2", "#3f5a6e"], face: ["#eef6fb", "#b2cadb", "#6c8ba2"], star: ["#ffffff", "#9db7c9"], leaf: ["#e2eef5", "#5f7d93"], glow: "#bcd5e4"},
  crystal: {rim: ["#ffffff", "#d9fbfd", "#6fd3df", "#1c8195"], face: ["#f4ffff", "#9fe6ee", "#33aabd"], star: ["#ffffff", "#8ae0ea"], leaf: ["#d4f8fb", "#2e9cb0"], glow: "#8ff0f7", faceOpacity: 0.78},
};

const SHIELD = "M120 24 C148 38 176 42 198 42 C198 118 172 170 120 206 C68 170 42 118 42 42 C64 42 92 38 120 24 Z";
const INNER = "M120 42 C143 53 166 57 182 57 C181 118 159 158 120 187 C81 158 59 118 58 57 C74 57 97 53 120 42 Z";

function starFacets(cx: number, cy: number, outer: number, inner: number) {
  const point = (radius: number, index: number) => {
    const angle = -Math.PI / 2 + (index * Math.PI) / 5;
    return [cx + radius * Math.cos(angle), cy + radius * Math.sin(angle)] as const;
  };
  const facets: Array<{points: string; lit: boolean}> = [];
  for (let tip = 0; tip < 5; tip += 1) {
    const [tx, ty] = point(outer, tip * 2);
    const [lx, ly] = point(inner, tip * 2 - 1);
    const [rx, ry] = point(inner, tip * 2 + 1);
    facets.push({points: `${cx},${cy} ${lx},${ly} ${tx},${ty}`, lit: true});
    facets.push({points: `${cx},${cy} ${tx},${ty} ${rx},${ry}`, lit: false});
  }
  return facets;
}

/** Leaves along one branch of the wreath (the other branch is mirrored). */
const STEM = {p0: [100, 214], p1: [20, 196], p2: [30, 70]} as const;
function onStem(t: number) {
  const {p0, p1, p2} = STEM;
  const x = (1 - t) ** 2 * p0[0] + 2 * (1 - t) * t * p1[0] + t ** 2 * p2[0];
  const y = (1 - t) ** 2 * p0[1] + 2 * (1 - t) * t * p1[1] + t ** 2 * p2[1];
  const dx = 2 * (1 - t) * (p1[0] - p0[0]) + 2 * t * (p2[0] - p1[0]);
  const dy = 2 * (1 - t) * (p1[1] - p0[1]) + 2 * t * (p2[1] - p1[1]);
  return {x, y, angle: (Math.atan2(dy, dx) * 180) / Math.PI};
}
function laurel() {
  const leaves: Array<{x: number; y: number; angle: number; size: number}> = [];
  for (let index = 0; index < 9; index += 1) {
    const t = 0.1 + index * 0.1;
    const {x, y, angle} = onStem(t);
    const size = 1.05 - t * 0.45;
    leaves.push({x, y, angle: angle - 38, size}); // outer side
    if (index % 2 === 0) leaves.push({x, y, angle: angle + 32, size: size * 0.85}); // inner side
  }
  return leaves;
}
const STEM_PATH = `M${STEM.p0[0]} ${STEM.p0[1]} Q${STEM.p1[0]} ${STEM.p1[1]} ${STEM.p2[0]} ${STEM.p2[1]}`;
/** An almond-shaped leaf with its base at the origin, pointing along +x. */
const LEAF = "M0 0 C5 -7 17 -8 26 0 C17 8 5 7 0 0 Z";

const FACETS = starFacets(120, 114, 52, 22);
const LEAVES = laurel();

export function RankEmblem({rank, size = 160, wreath = true, muted = false, className}: {rank: Rank; size?: number; wreath?: boolean; muted?: boolean; className?: string}) {
  const uid = useId().replace(/[^a-zA-Z0-9]/g, "");
  const id = (name: string) => `${name}-${uid}`;
  const p = RANK_PALETTES[rank];
  const crystal = rank === "crystal";

  return (
    <svg
      viewBox={wreath ? "0 0 240 240" : "30 14 180 206"}
      width={size}
      height={wreath ? size : Math.round((size * 206) / 180)}
      className={className}
      style={muted ? {filter: "grayscale(1)", opacity: 0.35} : undefined}
      aria-hidden
    >
      <defs>
        <linearGradient id={id("rim")} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor={p.rim[0]} />
          <stop offset="0.28" stopColor={p.rim[1]} />
          <stop offset="0.62" stopColor={p.rim[2]} />
          <stop offset="1" stopColor={p.rim[3]} />
        </linearGradient>
        <linearGradient id={id("rimEdge")} x1="1" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={p.rim[3]} />
          <stop offset="0.5" stopColor={p.rim[0]} />
          <stop offset="1" stopColor={p.rim[3]} />
        </linearGradient>
        <linearGradient id={id("face")} x1="0.2" y1="0" x2="0.8" y2="1">
          <stop offset="0" stopColor={p.face[0]} />
          <stop offset="0.5" stopColor={p.face[1]} />
          <stop offset="1" stopColor={p.face[2]} />
        </linearGradient>
        <radialGradient id={id("sheen")} cx="0.35" cy="0.25" r="0.75">
          <stop offset="0" stopColor="#ffffff" stopOpacity="0.85" />
          <stop offset="0.45" stopColor="#ffffff" stopOpacity="0.12" />
          <stop offset="1" stopColor="#ffffff" stopOpacity="0" />
        </radialGradient>
        <linearGradient id={id("leaf")} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor={p.leaf[0]} />
          <stop offset="1" stopColor={p.leaf[1]} />
        </linearGradient>
        <radialGradient id={id("cast")} cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" stopColor="#1d1517" stopOpacity="0.28" />
          <stop offset="1" stopColor="#1d1517" stopOpacity="0" />
        </radialGradient>
        <radialGradient id={id("halo")} cx="0.5" cy="0.45" r="0.5">
          <stop offset="0" stopColor={p.glow} stopOpacity="0.55" />
          <stop offset="1" stopColor={p.glow} stopOpacity="0" />
        </radialGradient>
        <clipPath id={id("innerClip")}>
          <path d={INNER} />
        </clipPath>
        {/* Inner shadow along the face edge, for depth below the rim. */}
        <filter id={id("innerShadow")} x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="5" />
        </filter>
        <filter id={id("drop")} x="-30%" y="-30%" width="160%" height="160%">
          <feDropShadow dx="0" dy="6" stdDeviation="6" floodColor="#1d1517" floodOpacity="0.28" />
        </filter>
        <filter id={id("soft")} x="-30%" y="-30%" width="160%" height="160%">
          <feDropShadow dx="0" dy="2" stdDeviation="2" floodColor="#1d1517" floodOpacity="0.35" />
        </filter>
        <filter id={id("glowEdge")} x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="2.5" />
        </filter>
      </defs>

      {/* Ambient glow and cast shadow */}
      <ellipse cx="120" cy="118" rx="112" ry="108" fill={`url(#${id("halo")})`} />
      <ellipse cx="120" cy="222" rx="70" ry="9" fill={`url(#${id("cast")})`} />

      {/* Laurel wreath */}
      {wreath ? (
        <g filter={`url(#${id("soft")})`}>
          {[1, -1].map((side) => (
            <g key={side} transform={side === -1 ? "translate(240 0) scale(-1 1)" : undefined}>
              <path d={STEM_PATH} fill="none" stroke={p.leaf[1]} strokeWidth="3" strokeLinecap="round" />
              {LEAVES.map((leaf, index) => (
                <g key={index} transform={`translate(${leaf.x} ${leaf.y}) rotate(${leaf.angle}) scale(${leaf.size})`}>
                  <path d={LEAF} fill={`url(#${id("leaf")})`} stroke={p.leaf[1]} strokeWidth="0.9" />
                  {/* midrib highlight for a sculpted look */}
                  <path d="M2 0 L22 0" stroke={p.leaf[0]} strokeWidth="1" strokeOpacity="0.9" />
                </g>
              ))}
            </g>
          ))}
        </g>
      ) : null}

      <g transform={wreath ? "translate(120 118) scale(0.84) translate(-120 -118)" : undefined}>
      {/* Shield: bevelled rim */}
      <g filter={`url(#${id("drop")})`}>
        <path d={SHIELD} fill={`url(#${id("rim")})`} />
        <path d={SHIELD} fill="none" stroke={`url(#${id("rimEdge")})`} strokeWidth="2.5" />
      </g>

      {/* Face */}
      <path d={INNER} fill={`url(#${id("face")})`} opacity={p.faceOpacity ?? 1} />
      <g clipPath={`url(#${id("innerClip")})`}>
        {/* darker right half: a central ridge catching light from the left */}
        <path d="M120 30 L210 30 L210 210 L120 210 Z" fill={p.face[2]} opacity="0.22" />
        <path d={INNER} fill="none" stroke="#1d1517" strokeOpacity="0.45" strokeWidth="9" filter={`url(#${id("innerShadow")})`} />
        {crystal ? (
          <g stroke="#ffffff" strokeOpacity="0.55" strokeWidth="1.2" fill="none">
            <path d="M58 70 L120 132 L182 70" />
            <path d="M74 150 L120 96 L166 150" />
            <path d="M120 42 L120 187" strokeOpacity="0.35" />
          </g>
        ) : null}
        <ellipse cx="96" cy="72" rx="62" ry="40" fill={`url(#${id("sheen")})`} />
      </g>
      <path d={INNER} fill="none" stroke={p.rim[0]} strokeOpacity="0.9" strokeWidth="1.4" />
      {crystal ? <path d={SHIELD} fill="none" stroke="#e8fdff" strokeWidth="3" opacity="0.8" filter={`url(#${id("glowEdge")})`} /> : null}

      {/* Faceted star */}
      <g filter={`url(#${id("soft")})`}>
        {FACETS.map((facet, index) => (
          <polygon key={index} points={facet.points} fill={facet.lit ? p.star[0] : p.star[1]} stroke={p.star[1]} strokeWidth="0.6" strokeLinejoin="round" />
        ))}
      </g>

      {/* Crystal only: a faceted gem crowning the shield — the most prestigious rank. */}
      {crystal ? (
        <g transform="translate(120 22)" filter={`url(#${id("soft")})`}>
          <polygon points="-16,-4 -8,-14 8,-14 16,-4 0,16" fill="#bff5f9" stroke="#2e9cb0" strokeWidth="0.8" strokeLinejoin="round" />
          <polygon points="-16,-4 -8,-14 -4,-4" fill="#ffffff" />
          <polygon points="-4,-4 0,-14 4,-4" fill="#e9fdff" />
          <polygon points="4,-4 8,-14 16,-4" fill="#8ee3ec" />
          <polygon points="-16,-4 -4,-4 0,16" fill="#d9fbfd" />
          <polygon points="-4,-4 4,-4 0,16" fill="#9fe6ee" />
          <polygon points="4,-4 16,-4 0,16" fill="#46bccd" />
        </g>
      ) : null}

      {/* Sparkles */}
      {(crystal ? [[86, 66, 1], [160, 150, 0.7], [170, 62, 0.55]] : [[88, 66, 0.7]]).map(([x, y, scale], index) => (
        <path
          key={index}
          d="M0 -10 C1 -2 2 -1 10 0 C2 1 1 2 0 10 C-1 2 -2 1 -10 0 C-2 -1 -1 -2 0 -10 Z"
          transform={`translate(${x} ${y}) scale(${scale})`}
          fill="#ffffff"
          opacity="0.95"
        />
      ))}
      </g>
    </svg>
  );
}
