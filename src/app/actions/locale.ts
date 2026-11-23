"use server";

import {cookies} from "next/headers";
import {refresh} from "next/cache";

import {isLocale, LOCALE_COOKIE} from "@/lib/i18n/core";

export async function setLocale(locale: string) {
  if (!isLocale(locale)) {
    return;
  }
  (await cookies()).set(LOCALE_COOKIE, locale, {path: "/", maxAge: 60 * 60 * 24 * 365, sameSite: "lax"});
  refresh();
}
