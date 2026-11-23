import Link from "next/link";
import {Award, BriefcaseBusiness, GraduationCap, Users, UsersRound} from "lucide-react";

import {Card, CardHeader} from "@/components/ui/card";
import type {GuestCategory} from "@/lib/data/guests";
import {categoryBreakdown, registrationStats} from "@/lib/data/registrations";
import {formatNumber} from "@/lib/i18n/core";
import {getI18n} from "@/lib/i18n/server";
import {cn} from "@/lib/utils/cn";

const CATEGORIES: Array<{key: GuestCategory; icon: typeof Users; bar: string; tint: string}> = [
  {key: "student", icon: GraduationCap, bar: "bg-crimson", tint: "bg-crimson-wash text-crimson"},
  {key: "visitor", icon: Users, bar: "bg-gold", tint: "bg-gold-wash text-gold"},
  {key: "graduate", icon: Award, bar: "bg-success", tint: "bg-success-wash text-success"},
  {key: "staff", icon: BriefcaseBusiness, bar: "bg-ink", tint: "bg-paper-deep text-ink"},
];

/**
 * Registration Statistics: approved individuals per category, counted from the guest table
 * (every family member separately). `selected` narrows the detail panel to one category.
 */
export async function RegistrationStatistics({selected}: {selected: GuestCategory | null}) {
  const {t, locale} = await getI18n();
  const {byCategory, total} = await registrationStats();
  const detail = selected ? await categoryBreakdown(selected) : null;
  const n = (value: number) => formatNumber(locale, value);
  const percent = (value: number) => (total ? Math.round((value / total) * 100) : 0);
  const filterHref = (key: GuestCategory | null) => (key ? `/staff?category=${key}#stats` : "/staff#stats");

  return (
    <section id="stats" className="mt-6 scroll-mt-20">
      <Card>
        <CardHeader title={t("staff.stats.title")} description={t("staff.stats.lede")} />

        <div className="grid grid-cols-2 gap-2.5 sm:gap-3 lg:grid-cols-5">
          {CATEGORIES.map((item) => (
            <Link
              key={item.key}
              href={filterHref(selected === item.key ? null : item.key)}
              aria-current={selected === item.key ? "true" : undefined}
              className={cn(
                "min-w-0 rounded-2xl bg-paper p-3.5 ring-1 ring-line transition hover:ring-ink/30 sm:p-4",
                selected === item.key && "ring-2 ring-crimson",
              )}
            >
              <span className={cn("grid size-9 place-items-center rounded-xl", item.tint)}>
                <item.icon className="size-5" aria-hidden />
              </span>
              <p className="mt-3 text-sm font-semibold text-ink-soft">{t(`staff.categoriesPlural.${item.key}`)}</p>
              <p className="tabular font-display text-2xl font-semibold sm:text-3xl" data-testid={`stat-${item.key}`}>
                {n(byCategory[item.key])}
              </p>
              <p className="text-xs text-muted">{t("staff.stats.share", {percent: n(percent(byCategory[item.key]))})}</p>
            </Link>
          ))}
          <div className="col-span-2 min-w-0 rounded-2xl bg-night p-3.5 text-white sm:p-4 lg:col-span-1">
            <span className="grid size-9 place-items-center rounded-xl bg-white/10">
              <UsersRound className="size-5" aria-hidden />
            </span>
            <p className="mt-3 text-sm font-semibold text-white/70">{t("staff.stats.total")}</p>
            <p className="tabular font-display text-2xl font-semibold sm:text-3xl" data-testid="stat-total">
              {n(total)}
            </p>
          </div>
        </div>

        {/* Share of each category, as one stacked bar. */}
        {total ? (
          <div className="mt-5">
            <div className="flex h-3 overflow-hidden rounded-full bg-paper-deep" role="img" aria-label={CATEGORIES.map((item) => `${t(`staff.categoriesPlural.${item.key}`)}: ${n(byCategory[item.key])}`).join(", ")}>
              {CATEGORIES.map((item) => (byCategory[item.key] ? <div key={item.key} className={item.bar} style={{width: `${(byCategory[item.key] / total) * 100}%`}} /> : null))}
            </div>
            <ul className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted">
              {CATEGORIES.map((item) => (
                <li key={item.key} className="inline-flex items-center gap-1.5">
                  <span className={cn("size-2.5 rounded-full", item.bar)} aria-hidden />
                  {t(`staff.categoriesPlural.${item.key}`)} · {n(percent(byCategory[item.key]))}%
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        {/* Filter: details for one category */}
        <nav className="-mx-4 mt-5 flex gap-2 overflow-x-auto border-t border-line px-4 pt-4 sm:mx-0 sm:flex-wrap sm:px-0" aria-label={t("staff.stats.filter")}>
          {[null, ...CATEGORIES.map((item) => item.key)].map((key) => (
            <Link
              key={key ?? "all"}
              href={filterHref(key)}
              aria-current={selected === key ? "page" : undefined}
              className={cn("inline-flex h-9 shrink-0 items-center rounded-full px-3.5 text-sm font-semibold ring-1", selected === key ? "bg-ink text-white ring-ink" : "bg-card text-ink-soft ring-line hover:ring-ink/30")}
            >
              {key ? t(`staff.categoriesPlural.${key}`) : t("staff.stats.all")}
            </Link>
          ))}
        </nav>
        {detail && selected ? (
          <dl className="mt-4 grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-6">
            <Detail label={t(`staff.categoriesPlural.${selected}`)} value={n(detail.total)} strong />
            <Detail label={t("staff.stats.checkedIn")} value={n(detail.checkedIn)} />
            <Detail label={t("staff.stats.online")} value={n(detail.online)} />
            <Detail label={t("staff.stats.desk")} value={n(detail.desk)} />
            {selected === "visitor" ? <Detail label={t("staff.stats.families")} value={n(detail.families)} /> : null}
            {selected === "visitor" ? <Detail label={t("staff.stats.children")} value={n(detail.children)} /> : null}
            <Detail label={t("staff.stats.pending")} value={n(detail.pending)} href="/staff/registrations" />
          </dl>
        ) : null}
      </Card>
    </section>
  );
}

function Detail({label, value, strong, href}: {label: string; value: string; strong?: boolean; href?: string}) {
  const body = (
    <>
      <dt className="text-xs font-semibold text-muted">{label}</dt>
      <dd className={cn("tabular mt-0.5 font-display font-semibold", strong ? "text-2xl text-crimson" : "text-xl")}>{value}</dd>
    </>
  );
  return href ? (
    <Link href={href} className="min-w-0 rounded-xl bg-paper px-3 py-2.5 ring-1 ring-line hover:ring-ink/30">
      {body}
    </Link>
  ) : (
    <div className="min-w-0 rounded-xl bg-paper px-3 py-2.5 ring-1 ring-line">{body}</div>
  );
}
