import {ar} from "@/lib/i18n/ar";
import {en} from "@/lib/i18n/en";

export type Locale = "en" | "ar";
export const LOCALES: Locale[] = ["en", "ar"];
export const LOCALE_COOKIE = "nd_locale";

type Widen<T> = {[K in keyof T]: T[K] extends string ? string : Widen<T[K]>};
export type Dictionary = Widen<typeof en>;

type Paths<T, Prefix extends string = ""> = {
  [K in keyof T & string]: T[K] extends string ? `${Prefix}${K}` : Paths<T[K], `${Prefix}${K}.`>;
}[keyof T & string];

export type MessageKey = Paths<Dictionary>;
export type Vars = Record<string, string | number>;

export const dictionaries: Record<Locale, Dictionary> = {en, ar};

export function translate(dict: Dictionary, key: MessageKey | string, vars?: Vars): string {
  let node: unknown = dict;
  for (const part of key.split(".")) {
    node = node && typeof node === "object" ? (node as Record<string, unknown>)[part] : undefined;
  }
  const template = typeof node === "string" ? node : key;
  return vars ? template.replace(/\{(\w+)\}/g, (match, name: string) => (name in vars ? String(vars[name]) : match)) : template;
}

export const isLocale = (value: unknown): value is Locale => value === "en" || value === "ar";

const TIME_ZONE = "Asia/Bahrain";
const intlLocale = (locale: Locale) => (locale === "ar" ? "ar-BH" : "en-GB");

export function formatDateTime(locale: Locale, iso: string) {
  return new Intl.DateTimeFormat(intlLocale(locale), {dateStyle: "medium", timeStyle: "short", timeZone: TIME_ZONE}).format(new Date(iso));
}

/** Formats a calendar date string (YYYY-MM-DD) without timezone drift. */
export function formatDay(locale: Locale, date: string, style: "long" | "short" = "long") {
  const [y, m, d] = date.split("-").map(Number);
  return new Intl.DateTimeFormat(intlLocale(locale), {
    weekday: style === "long" ? "long" : undefined,
    day: "numeric",
    month: style === "long" ? "long" : "short",
    year: style === "long" ? "numeric" : undefined,
    timeZone: "UTC",
  }).format(new Date(Date.UTC(y, m - 1, d)));
}

/** Formats "HH:MM" wall-clock time. */
export function formatClock(locale: Locale, time: string) {
  const [h, min] = time.split(":").map(Number);
  return new Intl.DateTimeFormat(intlLocale(locale), {hour: "numeric", minute: "2-digit", timeZone: "UTC"}).format(new Date(Date.UTC(2000, 0, 1, h, min)));
}

export function formatNumber(locale: Locale, value: number) {
  return new Intl.NumberFormat(intlLocale(locale)).format(value);
}

export function relativeTime(locale: Locale, iso: string, now = Date.now()) {
  const diff = (Date.parse(iso) - now) / 1000;
  const rtf = new Intl.RelativeTimeFormat(intlLocale(locale), {numeric: "auto"});
  const abs = Math.abs(diff);
  if (abs < 60) return rtf.format(Math.round(diff), "second");
  if (abs < 3600) return rtf.format(Math.round(diff / 60), "minute");
  if (abs < 86400) return rtf.format(Math.round(diff / 3600), "hour");
  return rtf.format(Math.round(diff / 86400), "day");
}
