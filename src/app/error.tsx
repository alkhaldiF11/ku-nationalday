"use client";

import {useEffect} from "react";

import {Button} from "@/components/ui/button";
import {useI18n} from "@/lib/i18n/client";

export default function ErrorPage({error, reset}: {error: Error & {digest?: string}; reset: () => void}) {
  const {t} = useI18n();
  useEffect(() => {
    console.error(error);
  }, [error]);
  return (
    <div className="grid min-h-[60dvh] place-items-center px-4">
      <div className="max-w-md text-center">
        <h1 className="font-display text-3xl font-semibold">{t("errorPage.title")}</h1>
        <p className="mt-2 text-ink-soft">{t("errorPage.body")}</p>
        {error.digest ? <p className="mt-2 font-mono text-xs text-muted">{error.digest}</p> : null}
        <Button className="mt-6" onClick={reset}>
          {t("errorPage.retry")}
        </Button>
      </div>
    </div>
  );
}
