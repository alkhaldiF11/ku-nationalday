import type {ComponentProps, ReactNode} from "react";

import {cn} from "@/lib/utils/cn";

export function Card({className, ...props}: ComponentProps<"section">) {
  return <section className={cn("min-w-0 rounded-[var(--radius-card)] bg-card p-4 shadow-[var(--shadow-card)] ring-1 ring-line sm:p-6", className)} {...props} />;
}

export function CardHeader({title, description, action, className}: {title: ReactNode; description?: ReactNode; action?: ReactNode; className?: string}) {
  return (
    <div className={cn("mb-5 flex flex-wrap items-start justify-between gap-3", className)}>
      <div className="min-w-0">
        {title ? <h2 className="text-lg font-bold tracking-tight text-ink">{title}</h2> : null}
        {description ? <p className="mt-1 text-sm text-muted">{description}</p> : null}
      </div>
      {action ? <div className="flex shrink-0 flex-wrap gap-2">{action}</div> : null}
    </div>
  );
}

export function Badge({tone = "neutral", className, ...props}: ComponentProps<"span"> & {tone?: "neutral" | "crimson" | "gold" | "success" | "danger" | "dark"}) {
  const tones = {
    neutral: "bg-paper-deep text-ink-soft",
    crimson: "bg-crimson-wash text-crimson-deep",
    gold: "bg-gold-wash text-gold",
    success: "bg-success-wash text-success",
    danger: "bg-danger-wash text-danger",
    dark: "bg-ink text-white",
  };
  return <span className={cn("inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold whitespace-nowrap", tones[tone], className)} {...props} />;
}

export function EmptyState({icon, title, children, className}: {icon?: ReactNode; title: ReactNode; children?: ReactNode; className?: string}) {
  return (
    <div className={cn("flex flex-col items-center justify-center rounded-2xl border border-dashed border-line-strong bg-paper/60 px-6 py-10 text-center", className)}>
      {icon ? <div className="mb-3 text-muted [&_svg]:size-7">{icon}</div> : null}
      <p className="font-semibold text-ink-soft">{title}</p>
      {children ? <div className="mt-1 max-w-sm text-sm text-muted">{children}</div> : null}
    </div>
  );
}

export function Stat({label, value, hint, icon, tone = "neutral"}: {label: ReactNode; value: ReactNode; hint?: ReactNode; icon?: ReactNode; tone?: "neutral" | "crimson" | "gold" | "success"}) {
  const iconTone = {neutral: "bg-paper-deep text-ink-soft", crimson: "bg-crimson-wash text-crimson", gold: "bg-gold-wash text-gold", success: "bg-success-wash text-success"}[tone];
  return (
    <div className="rounded-2xl bg-card p-4 ring-1 ring-line shadow-[var(--shadow-card)]">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-semibold tracking-wide text-muted uppercase">{label}</p>
        {icon ? <span className={cn("grid size-8 place-items-center rounded-lg [&_svg]:size-4", iconTone)}>{icon}</span> : null}
      </div>
      <p className="tabular mt-2 font-display text-3xl font-semibold text-ink">{value}</p>
      {hint ? <p className="mt-1 text-xs text-muted">{hint}</p> : null}
    </div>
  );
}

export function PageHeader({eyebrow, title, description, action}: {eyebrow?: ReactNode; title: ReactNode; description?: ReactNode; action?: ReactNode}) {
  return (
    <header className="mb-5 flex flex-wrap items-end justify-between gap-3 animate-rise sm:mb-6 sm:gap-4">
      <div className="min-w-0">
        {eyebrow ? <p className="mb-1 text-xs font-bold tracking-[0.14em] text-crimson uppercase">{eyebrow}</p> : null}
        <h1 className="font-display text-2xl font-semibold tracking-tight text-ink sm:text-3xl lg:text-4xl">{title}</h1>
        {description ? <p className="mt-1.5 max-w-2xl text-[15px] text-ink-soft sm:mt-2 sm:text-base">{description}</p> : null}
      </div>
      {action ? <div className="flex flex-wrap gap-2">{action}</div> : null}
    </header>
  );
}
