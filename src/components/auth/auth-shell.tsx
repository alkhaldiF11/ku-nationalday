import type {ReactNode} from "react";

import {FlagMark} from "@/components/ui/flag-mark";

/** Two-panel layout for sign-in pages: form card beside a flag panel (or a `side` panel, e.g. registration). */
export function AuthShell({title, lede, children, aside, side}: {title: string; lede: string; children: ReactNode; aside?: ReactNode; side?: ReactNode}) {
  return (
    <div className="mx-auto grid max-w-5xl gap-6 px-4 py-8 sm:px-6 sm:py-12 lg:grid-cols-[1fr_0.95fr] lg:gap-8 lg:py-20">
      <div className="min-w-0 animate-rise rounded-[2rem] bg-card p-6 shadow-[var(--shadow-card)] ring-1 ring-line sm:p-10">
        <h1 className="font-display text-3xl font-semibold tracking-tight sm:text-4xl">{title}</h1>
        <p className="mt-2 mb-8 text-ink-soft">{lede}</p>
        {children}
      </div>
      {side ? <div className="min-w-0 animate-rise [animation-delay:80ms]">{side}</div> : null}
      <div className={side ? "hidden" : "relative hidden overflow-hidden rounded-[2rem] lg:block"} aria-hidden>
        <FlagMark cover />
        {aside ? <div className="absolute inset-x-6 bottom-6 rounded-2xl bg-card/95 p-5 text-sm text-ink-soft shadow-[var(--shadow-lift)] backdrop-blur">{aside}</div> : null}
      </div>
    </div>
  );
}
