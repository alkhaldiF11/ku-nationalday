"use client";

import {CheckCircle2, Info, X, XCircle} from "lucide-react";
import {createContext, useCallback, useContext, useMemo, useState} from "react";

import {cn} from "@/lib/utils/cn";

type Tone = "success" | "error" | "info";
type Toast = {id: number; tone: Tone; message: string};

const ToastContext = createContext<((tone: Tone, message: string) => void) | null>(null);

let counter = 0;

export function ToastProvider({children}: {children: React.ReactNode}) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const dismiss = useCallback((id: number) => setToasts((items) => items.filter((item) => item.id !== id)), []);

  const push = useCallback(
    (tone: Tone, message: string) => {
      const id = ++counter;
      setToasts((items) => [...items.slice(-3), {id, tone, message}]);
      window.setTimeout(() => dismiss(id), tone === "error" ? 6000 : 4000);
    },
    [dismiss],
  );

  const value = useMemo(() => push, [push]);
  const icons = {success: CheckCircle2, error: XCircle, info: Info};

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="no-print pointer-events-none fixed inset-x-0 bottom-4 z-[60] flex flex-col items-center gap-2 px-4" aria-live="polite">
        {toasts.map((toast) => {
          const Icon = icons[toast.tone];
          return (
            <div
              key={toast.id}
              role={toast.tone === "error" ? "alert" : "status"}
              className={cn(
                "pointer-events-auto flex w-full max-w-md animate-rise items-start gap-3 rounded-2xl px-4 py-3 text-sm font-semibold shadow-[var(--shadow-lift)] ring-1",
                toast.tone === "success" && "bg-ink text-white ring-ink",
                toast.tone === "error" && "bg-danger text-white ring-danger",
                toast.tone === "info" && "bg-card text-ink ring-line",
              )}
            >
              <Icon className="mt-0.5 size-4 shrink-0" aria-hidden />
              <p className="flex-1">{toast.message}</p>
              <button type="button" onClick={() => dismiss(toast.id)} className="-m-1 rounded-lg p-1 opacity-70 hover:opacity-100" aria-label="Dismiss">
                <X className="size-4" />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const push = useContext(ToastContext);
  if (!push) {
    throw new Error("useToast must be used inside ToastProvider");
  }
  return push;
}
