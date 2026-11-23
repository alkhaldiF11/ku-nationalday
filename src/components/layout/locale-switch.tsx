"use client";

import {Languages} from "lucide-react";
import {useTransition} from "react";

import {setLocale} from "@/app/actions/locale";
import {useI18n} from "@/lib/i18n/client";
import {cn} from "@/lib/utils/cn";

export function LocaleSwitch({className, tone = "light"}: {className?: string; tone?: "light" | "dark"}) {
  const {locale, t} = useI18n();
  const [pending, startTransition] = useTransition();
  const next = locale === "en" ? "ar" : "en";
  return (
    <button
      type="button"
      onClick={() => startTransition(() => setLocale(next))}
      disabled={pending}
      aria-label={t("common.languageLabel")}
      lang={next}
      className={cn(
        "inline-flex h-9 items-center gap-1.5 rounded-xl px-3 text-sm font-semibold transition disabled:opacity-60",
        tone === "light" ? "text-ink-soft hover:bg-paper-deep hover:text-ink" : "text-white/80 hover:bg-white/10 hover:text-white",
        className,
      )}
    >
      <Languages className="size-4" aria-hidden />
      {t("common.language")}
    </button>
  );
}
