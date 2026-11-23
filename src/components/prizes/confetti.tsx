"use client";

import {useEffect, useRef} from "react";

const COLORS = ["#ce1126", "#ffffff", "#f7c873", "#9c0c1d", "#ffe7a8"];

/**
 * Full-screen canvas confetti burst (flag red, white and gold). Skipped when reduced motion is requested.
 * `count` and `scale` tune how busy it is; `delayMs` lets an entrance animation play first.
 */
export function Confetti({durationMs = 6000, count = 220, scale = 1, delayMs = 0}: {durationMs?: number; count?: number; scale?: number; delayMs?: number}) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    const context = canvas?.getContext("2d");
    if (!canvas || !context || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const resize = () => {
      canvas.width = window.innerWidth * devicePixelRatio;
      canvas.height = window.innerHeight * devicePixelRatio;
    };
    resize();
    window.addEventListener("resize", resize);

    const pieces = Array.from({length: count}, () => ({
      x: Math.random() * canvas.width,
      y: -Math.random() * canvas.height * 0.6,
      w: (6 + Math.random() * 8) * scale * devicePixelRatio,
      h: (10 + Math.random() * 14) * scale * devicePixelRatio,
      vy: (2 + Math.random() * 4) * devicePixelRatio,
      vx: (Math.random() - 0.5) * 2.5 * devicePixelRatio,
      angle: Math.random() * Math.PI,
      spin: (Math.random() - 0.5) * 0.25,
      color: COLORS[Math.floor(Math.random() * COLORS.length)],
    }));

    const start = performance.now() + delayMs;
    let frame = 0;
    const tick = (now: number) => {
      const elapsed = now - start;
      if (elapsed < 0) {
        frame = requestAnimationFrame(tick); // still waiting for the entrance animation
        return;
      }
      context.clearRect(0, 0, canvas.width, canvas.height);
      context.globalAlpha = elapsed > durationMs - 1200 ? Math.max(0, (durationMs - elapsed) / 1200) : 1;
      for (const piece of pieces) {
        piece.x += piece.vx + Math.sin((now + piece.y) / 400) * 0.6;
        piece.y += piece.vy;
        piece.angle += piece.spin;
        if (piece.y > canvas.height && elapsed < durationMs - 1500) {
          piece.y = -piece.h;
          piece.x = Math.random() * canvas.width;
        }
        context.save();
        context.translate(piece.x, piece.y);
        context.rotate(piece.angle);
        context.fillStyle = piece.color;
        context.fillRect(-piece.w / 2, -piece.h / 2, piece.w, piece.h * Math.abs(Math.cos(piece.angle * 2)) + 2);
        context.restore();
      }
      if (elapsed < durationMs) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("resize", resize);
    };
  }, [durationMs, count, scale, delayMs]);

  return <canvas ref={ref} className="pointer-events-none fixed inset-0 z-[80] size-full" aria-hidden />;
}
