"use client";

import {createContext, useCallback, useContext, useMemo} from "react";

import {translate, type Dictionary, type Locale, type MessageKey, type Vars} from "@/lib/i18n/core";

type I18nValue = {locale: Locale; dict: Dictionary; t: (key: MessageKey, vars?: Vars) => string};

const I18nContext = createContext<I18nValue | null>(null);

export function I18nProvider({locale, dict, children}: {locale: Locale; dict: Dictionary; children: React.ReactNode}) {
  const t = useCallback((key: MessageKey, vars?: Vars) => translate(dict, key, vars), [dict]);
  const value = useMemo(() => ({locale, dict, t}), [locale, dict, t]);
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  const value = useContext(I18nContext);
  if (!value) {
    throw new Error("useI18n must be used inside I18nProvider");
  }
  return value;
}
