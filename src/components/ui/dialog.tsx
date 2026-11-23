"use client";

import {X} from "lucide-react";
import {useEffect, useRef, useState, useTransition, type ReactNode} from "react";

import {Button} from "@/components/ui/button";
import {useI18n} from "@/lib/i18n/client";
import {cn} from "@/lib/utils/cn";

/** Accessible modal built on the native <dialog> element (focus trap, Esc, backdrop). */
export function Dialog({open, onClose, title, description, children, size = "md"}: {open: boolean; onClose: () => void; title: ReactNode; description?: ReactNode; children: ReactNode; size?: "sm" | "md" | "lg"}) {
  const ref = useRef<HTMLDialogElement>(null);
  const {t} = useI18n();

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      onClose={onClose}
      onClick={(event) => {
        if (event.target === ref.current) onClose();
      }}
      className={cn(
        "m-auto w-[calc(100%-2rem)] rounded-3xl bg-card p-0 text-ink shadow-[var(--shadow-lift)] backdrop:bg-night/50 backdrop:backdrop-blur-[2px] open:animate-pop",
        size === "sm" && "max-w-md",
        size === "md" && "max-w-xl",
        size === "lg" && "max-w-3xl",
      )}
    >
      {open ? (
        <div className="max-h-[85vh] overflow-y-auto p-6">
          <div className="mb-5 flex items-start justify-between gap-4">
            <div>
              <h2 className="font-display text-xl font-semibold">{title}</h2>
              {description ? <p className="mt-1 text-sm text-muted">{description}</p> : null}
            </div>
            <button type="button" onClick={onClose} className="-m-1 rounded-lg p-1.5 text-muted hover:bg-paper-deep hover:text-ink" aria-label={t("common.close")}>
              <X className="size-5" />
            </button>
          </div>
          {children}
        </div>
      ) : null}
    </dialog>
  );
}

/** A button that asks for confirmation in a dialog before running `onConfirm`. */
export function ConfirmButton({
  children,
  message,
  confirmLabel,
  onConfirm,
  variant = "danger",
  size = "sm",
  className,
}: {
  children: ReactNode;
  message: ReactNode;
  confirmLabel?: ReactNode;
  onConfirm: () => Promise<unknown> | unknown;
  variant?: "danger" | "secondary" | "primary";
  size?: "sm" | "md";
  className?: string;
}) {
  const {t} = useI18n();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  return (
    <>
      <Button variant={variant} size={size} className={className} onClick={() => setOpen(true)}>
        {children}
      </Button>
      <Dialog open={open} onClose={() => setOpen(false)} title={children} size="sm">
        <p className="text-ink-soft">{message}</p>
        <div className="mt-6 flex justify-end gap-2">
          <Button variant="secondary" onClick={() => setOpen(false)}>
            {t("common.cancel")}
          </Button>
          <Button
            variant={variant === "secondary" ? "primary" : variant}
            pending={pending}
            onClick={() =>
              startTransition(async () => {
                await onConfirm();
                setOpen(false);
              })
            }
          >
            {confirmLabel ?? t("common.confirmDelete")}
          </Button>
        </div>
      </Dialog>
    </>
  );
}
