"use client";

import {useId, type ComponentProps, type ReactNode} from "react";

import {useI18n} from "@/lib/i18n/client";
import type {MessageKey} from "@/lib/i18n/core";
import {cn} from "@/lib/utils/cn";

const control =
  "w-full rounded-xl bg-card px-3.5 text-[15px] text-ink ring-1 ring-line-strong transition placeholder:text-muted/70 hover:ring-ink/25 focus:ring-2 focus:ring-crimson focus:outline-none disabled:bg-paper disabled:text-muted aria-[invalid=true]:ring-danger";

type FieldProps = {
  label: ReactNode;
  name: string;
  hint?: ReactNode;
  /** A `validation.*` key from an action's fieldErrors. */
  error?: string;
  optional?: boolean;
  className?: string;
};

function FieldShell({label, hint, error, optional, className, id, children}: Omit<FieldProps, "name"> & {id: string; children: ReactNode}) {
  const {t} = useI18n();
  return (
    <div className={cn("space-y-1.5", className)}>
      <label htmlFor={id} className="flex items-baseline gap-1.5 text-sm font-semibold text-ink-soft">
        {label}
        {optional ? <span className="text-xs font-normal text-muted">({t("common.optional")})</span> : null}
      </label>
      {children}
      {error ? (
        <p id={`${id}-error`} className="text-xs font-semibold text-danger" role="alert">
          {t(error as MessageKey)}
        </p>
      ) : hint ? (
        <p id={`${id}-hint`} className="text-xs text-muted">
          {hint}
        </p>
      ) : null}
    </div>
  );
}

export function TextField({label, name, hint, error, optional, className, ...props}: FieldProps & Omit<ComponentProps<"input">, "name">) {
  const id = useId();
  return (
    <FieldShell label={label} hint={hint} error={error} optional={optional} className={className} id={id}>
      <input
        id={id}
        name={name}
        className={cn(control, "h-11")}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${id}-error` : hint ? `${id}-hint` : undefined}
        {...props}
      />
    </FieldShell>
  );
}

export function TextAreaField({label, name, hint, error, optional, className, ...props}: FieldProps & Omit<ComponentProps<"textarea">, "name">) {
  const id = useId();
  return (
    <FieldShell label={label} hint={hint} error={error} optional={optional} className={className} id={id}>
      <textarea id={id} name={name} rows={3} className={cn(control, "py-2.5 leading-relaxed")} aria-invalid={error ? true : undefined} {...props} />
    </FieldShell>
  );
}

export function SelectField({label, name, hint, error, optional, className, children, ...props}: FieldProps & Omit<ComponentProps<"select">, "name">) {
  const id = useId();
  return (
    <FieldShell label={label} hint={hint} error={error} optional={optional} className={className} id={id}>
      <select id={id} name={name} className={cn(control, "h-11 appearance-auto")} aria-invalid={error ? true : undefined} {...props}>
        {children}
      </select>
    </FieldShell>
  );
}

export function Toggle({label, name, defaultChecked, className, description}: {label: ReactNode; name: string; defaultChecked?: boolean; className?: string; description?: ReactNode}) {
  const id = useId();
  return (
    <label htmlFor={id} className={cn("flex cursor-pointer items-start gap-3 rounded-xl p-1", className)}>
      <span className="relative mt-0.5 inline-flex shrink-0">
        <input id={id} name={name} type="checkbox" defaultChecked={defaultChecked} className="peer sr-only" />
        <span className="h-6 w-10 rounded-full bg-line-strong transition peer-checked:bg-crimson peer-focus-visible:ring-2 peer-focus-visible:ring-crimson peer-focus-visible:ring-offset-2" />
        <span className="absolute top-1 start-1 size-4 rounded-full bg-white shadow transition peer-checked:translate-x-4 rtl:peer-checked:-translate-x-4" />
      </span>
      <span>
        <span className="block text-sm font-semibold text-ink-soft">{label}</span>
        {description ? <span className="block text-xs text-muted">{description}</span> : null}
      </span>
    </label>
  );
}

export function FormAlert({tone = "danger", children}: {tone?: "danger" | "success"; children: ReactNode}) {
  return (
    <div
      role={tone === "danger" ? "alert" : "status"}
      className={cn(
        "rounded-xl px-4 py-3 text-sm font-semibold",
        tone === "danger" ? "bg-danger-wash text-danger" : "bg-success-wash text-success",
      )}
    >
      {children}
    </div>
  );
}
