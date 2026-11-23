import Link from "next/link";
import {LoaderCircle} from "lucide-react";
import type {ComponentProps} from "react";

import {cn} from "@/lib/utils/cn";

type Variant = "primary" | "secondary" | "ghost" | "danger" | "dark" | "success";
type Size = "sm" | "md" | "lg";

const base =
  "inline-flex items-center justify-center gap-2 rounded-xl font-semibold transition duration-150 select-none disabled:pointer-events-none disabled:opacity-50 active:translate-y-px whitespace-nowrap";

const variants: Record<Variant, string> = {
  primary: "bg-crimson text-white shadow-[0_8px_20px_-10px_rgb(206_17_38/0.7)] hover:bg-crimson-deep",
  secondary: "bg-card text-ink ring-1 ring-line-strong hover:ring-ink/30 hover:bg-paper",
  ghost: "text-ink-soft hover:bg-paper-deep hover:text-ink",
  danger: "bg-danger-wash text-danger ring-1 ring-danger/20 hover:bg-danger hover:text-white",
  dark: "bg-ink text-white hover:bg-ink-soft",
  success: "bg-success text-white hover:brightness-110",
};

const sizes: Record<Size, string> = {
  sm: "h-9 px-3 text-sm",
  md: "h-11 px-4 text-sm",
  lg: "h-14 px-6 text-base",
};

export function buttonClass(variant: Variant = "primary", size: Size = "md", className?: string) {
  return cn(base, variants[variant], sizes[size], className);
}

type ButtonProps = ComponentProps<"button"> & {variant?: Variant; size?: Size; pending?: boolean};

export function Button({variant, size, pending, className, children, disabled, type = "button", ...props}: ButtonProps) {
  return (
    <button type={type} className={buttonClass(variant, size, className)} disabled={disabled || pending} aria-busy={pending || undefined} {...props}>
      {pending ? <LoaderCircle className="size-4 animate-spin" aria-hidden /> : null}
      {children}
    </button>
  );
}

type ButtonLinkProps = ComponentProps<typeof Link> & {variant?: Variant; size?: Size};

export function ButtonLink({variant, size, className, ...props}: ButtonLinkProps) {
  return <Link className={buttonClass(variant, size, className)} {...props} />;
}
