import {cookies} from "next/headers";
import {cache} from "react";

import {dictionaries, isLocale, LOCALE_COOKIE, translate, type Locale, type MessageKey, type Vars} from "@/lib/i18n/core";

export const getLocale = cache(async (): Promise<Locale> => {
  const value = (await cookies()).get(LOCALE_COOKIE)?.value;
  return isLocale(value) ? value : "en";
});

export async function getI18n() {
  const locale = await getLocale();
  const dict = dictionaries[locale];
  return {
    locale,
    dir: locale === "ar" ? ("rtl" as const) : ("ltr" as const),
    dict,
    t: (key: MessageKey, vars?: Vars) => translate(dict, key, vars),
  };
}
