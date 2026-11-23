"use client";

import {useId} from "react";

/*
 * Premium 3D golden trophy for the winner pop-up: a cylindrical cup shaded with layered metallic
 * gradients (bright → champagne → deep gold), a rim showing the opening, bevelled handles with
 * light edges, a faceted star, a two-step plinth, a reflective streak and soft glowing edges.
 */

const STAR = (() => {
  const point = (radius: number, index: number) => {
    const angle = -Math.PI / 2 + (index * Math.PI) / 5;
    return [100 + radius * Math.cos(angle), 84 + radius * Math.sin(angle)] as const;
  };
  const facets: Array<{points: string; lit: boolean}> = [];
  for (let tip = 0; tip < 5; tip += 1) {
    const [tx, ty] = point(19, tip * 2);
    const [lx, ly] = point(8, tip * 2 - 1);
    const [rx, ry] = point(8, tip * 2 + 1);
    facets.push({points: `100,84 ${lx},${ly} ${tx},${ty}`, lit: true});
    facets.push({points: `100,84 ${tx},${ty} ${rx},${ry}`, lit: false});
  }
  return facets;
})();

export function TrophyEmblem({size = 132, className}: {size?: number; className?: string}) {
  const uid = useId().replace(/[^a-zA-Z0-9]/g, "");
  const id = (name: string) => `${name}-${uid}`;
  const url = (name: string) => `url(#${id(name)})`;

  return (
    <svg viewBox="0 0 200 220" width={size} height={(size * 220) / 200} className={className} aria-hidden>
      <defs>
        {/* Cylinder shading: dark edges, bright highlight left of centre */}
        <linearGradient id={id("body")} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#7a4b08" />
          <stop offset="0.16" stopColor="#d9a136" />
          <stop offset="0.32" stopColor="#fff2c2" />
          <stop offset="0.45" stopColor="#f3cf6b" />
          <stop offset="0.72" stopColor="#c98b1b" />
          <stop offset="1" stopColor="#6e4206" />
        </linearGradient>
        <linearGradient id={id("rim")} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#a8701a" />
          <stop offset="0.35" stopColor="#fff7d6" />
          <stop offset="0.7" stopColor="#e2ad3c" />
          <stop offset="1" stopColor="#8a5a0c" />
        </linearGradient>
        <linearGradient id={id("inside")} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#6e4206" />
          <stop offset="1" stopColor="#c98b1b" />
        </linearGradient>
        <linearGradient id={id("handle")} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#fff2c2" />
          <stop offset="0.5" stopColor="#d9a136" />
          <stop offset="1" stopColor="#7a4b08" />
        </linearGradient>
        <linearGradient id={id("base")} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#6e4206" />
          <stop offset="0.3" stopColor="#e9b649" />
          <stop offset="0.5" stopColor="#fff2c2" />
          <stop offset="0.75" stopColor="#c98b1b" />
          <stop offset="1" stopColor="#5c3604" />
        </linearGradient>
        <linearGradient id={id("plinth")} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#3b0a12" />
          <stop offset="1" stopColor="#1d0509" />
        </linearGradient>
        <linearGradient id={id("streak")} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#ffffff" stopOpacity="0" />
          <stop offset="0.5" stopColor="#ffffff" stopOpacity="0.85" />
          <stop offset="1" stopColor="#ffffff" stopOpacity="0" />
        </linearGradient>
        <radialGradient id={id("shadow")} cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" stopColor="#1d0509" stopOpacity="0.35" />
          <stop offset="1" stopColor="#1d0509" stopOpacity="0" />
        </radialGradient>
        <filter id={id("edgeGlow")} x="-30%" y="-30%" width="160%" height="160%">
          <feGaussianBlur stdDeviation="2.2" />
        </filter>
        <filter id={id("drop")} x="-30%" y="-30%" width="160%" height="160%">
          <feDropShadow dx="0" dy="5" stdDeviation="5" floodColor="#5c0a16" floodOpacity="0.35" />
        </filter>
      </defs>

      <ellipse cx="100" cy="212" rx="62" ry="7" fill={url("shadow")} />

      <g filter={url("drop")}>
        {/* Handles: thick gold with a light bevel edge */}
        {[1, -1].map((side) => (
          <g key={side} transform={side === -1 ? "translate(200 0) scale(-1 1)" : undefined}>
            <path d="M46 52 C10 52 10 108 58 112" fill="none" stroke={url("handle")} strokeWidth="11" strokeLinecap="round" />
            <path d="M46 52 C14 53 14 104 56 109" fill="none" stroke="#fff6d6" strokeWidth="2" strokeLinecap="round" opacity="0.75" />
          </g>
        ))}

        {/* Stem, knot and base */}
        <path d="M90 134 C92 150 88 160 82 168 H118 C112 160 108 150 110 134 Z" fill={url("body")} />
        <ellipse cx="100" cy="146" rx="13" ry="5" fill={url("rim")} />
        <path d="M66 168 H134 L140 184 H60 Z" fill={url("base")} />
        <rect x="52" y="184" width="96" height="22" rx="4" fill={url("plinth")} />
        <rect x="52" y="184" width="96" height="3" rx="1.5" fill="#e9b649" opacity="0.85" />
        <rect x="76" y="191" width="48" height="9" rx="2" fill="#e9b649" opacity="0.9" />

        {/* Cup */}
        <path d="M42 40 H158 C158 96 136 130 100 138 C64 130 42 96 42 40 Z" fill={url("body")} />
        <ellipse cx="100" cy="40" rx="58" ry="10" fill={url("rim")} />
        <ellipse cx="100" cy="41" rx="51" ry="6.5" fill={url("inside")} />
        {/* Reflective streak and bright left edge */}
        <path d="M62 50 C62 86 72 112 88 124" fill="none" stroke={url("streak")} strokeWidth="7" strokeLinecap="round" opacity="0.8" />
        <path d="M44 44 C46 92 66 124 98 136" fill="none" stroke="#fff3c4" strokeWidth="2" opacity="0.55" />
      </g>

      {/* Faceted star on the cup */}
      {STAR.map((facet, index) => (
        <polygon key={index} points={facet.points} fill={facet.lit ? "#fff8dc" : "#c9871c"} stroke="#a8701a" strokeWidth="0.6" strokeLinejoin="round" />
      ))}

      {/* Glowing rim edge and sparkles */}
      <ellipse cx="100" cy="40" rx="58" ry="10" fill="none" stroke="#fff6cf" strokeWidth="2.5" opacity="0.8" filter={url("edgeGlow")} />
      {[
        [64, 30, 0.9],
        [146, 70, 0.6],
        [118, 22, 0.5],
      ].map(([x, y, scale], index) => (
        <path
          key={index}
          d="M0 -10 C1 -2 2 -1 10 0 C2 1 1 2 0 10 C-1 2 -2 1 -10 0 C-2 -1 -1 -2 0 -10 Z"
          transform={`translate(${x} ${y}) scale(${scale})`}
          fill="#ffffff"
        />
      ))}
    </svg>
  );
}
