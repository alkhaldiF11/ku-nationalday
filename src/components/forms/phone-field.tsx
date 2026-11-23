"use client";

import {getCountries, getCountryCallingCode, parsePhoneNumberFromString, type CountryCode} from "libphonenumber-js";
import {useId, useMemo, useState} from "react";

import {useI18n} from "@/lib/i18n/client";
import type {MessageKey} from "@/lib/i18n/core";
import {cn} from "@/lib/utils/cn";

const flag = (country: string) => String.fromCodePoint(...[...country].map((letter) => 0x1f1a5 + letter.charCodeAt(0)));

/**
 * International phone input: a country picker (every country, with its dialling code) and the
 * number. Submits one E.164 value (e.g. +966501234567) under `name`; the server validates it
 * again with the same library, so this is only a convenience.
 */
export function PhoneField({
  label,
  name,
  hint,
  error,
  optional,
  required,
  defaultCountry = "BH",
}: {
  label: string;
  name: string;
  hint?: string;
  error?: string;
  optional?: boolean;
  required?: boolean;
  defaultCountry?: CountryCode;
}) {
  const {t, locale} = useI18n();
  const id = useId();
  const [country, setCountry] = useState<CountryCode>(defaultCountry);
  const [number, setNumber] = useState("");

  // Every country, named in the page language, sorted alphabetically (Bahrain and the Gulf first).
  const countries = useMemo(() => {
    const names = new Intl.DisplayNames([locale === "ar" ? "ar" : "en"], {type: "region"});
    const gulf: CountryCode[] = ["BH", "SA", "AE", "KW", "QA", "OM"];
    const all = getCountries().map((code) => ({code, name: names.of(code) ?? code, dial: getCountryCallingCode(code)}));
    const collator = new Intl.Collator(locale);
    return [...gulf.map((code) => all.find((item) => item.code === code)!), ...all.filter((item) => !gulf.includes(item.code)).sort((a, b) => collator.compare(a.name, b.name))];
  }, [locale]);

  // What the server receives: a full international number (a typed "+…" wins over the picker).
  const value = useMemo(() => {
    const raw = number.trim();
    if (!raw) return "";
    const parsed = raw.startsWith("+") || raw.startsWith("00") ? parsePhoneNumberFromString(raw.replace(/^00/, "+")) : parsePhoneNumberFromString(raw, country);
    return parsed?.number ?? `+${getCountryCallingCode(country)}${raw.replace(/\D/g, "")}`;
  }, [number, country]);

  const describedBy = error ? `${id}-error` : hint ? `${id}-hint` : undefined;
  const control =
    "h-11 rounded-xl bg-card text-[15px] text-ink ring-1 ring-line-strong transition focus:ring-2 focus:ring-crimson focus:outline-none aria-[invalid=true]:ring-danger";

  return (
    <div className="space-y-1.5">
      <label htmlFor={`${id}-number`} className="flex items-center gap-1.5 text-sm font-semibold text-ink">
        {label}
        {optional ? <span className="text-xs font-normal text-muted">({t("common.optional")})</span> : null}
      </label>
      {/* Country first, number second — always left-to-right, like the number itself. */}
      <div className="grid grid-cols-[minmax(0,8.5rem)_minmax(0,1fr)] gap-2" dir="ltr">
        <select
          aria-label={t("register.country")}
          value={country}
          onChange={(event) => setCountry(event.target.value as CountryCode)}
          className={cn(control, "min-w-0 px-2")}
        >
          {countries.map((item) => (
            <option key={item.code} value={item.code}>
              {flag(item.code)} +{item.dial} {item.name}
            </option>
          ))}
        </select>
        <input
          id={`${id}-number`}
          type="tel"
          inputMode="tel"
          autoComplete="tel-national"
          value={number}
          onChange={(event) => setNumber(event.target.value)}
          required={required}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy}
          className={cn(control, "min-w-0 px-3.5")}
        />
      </div>
      <input type="hidden" name={name} value={value} />
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
