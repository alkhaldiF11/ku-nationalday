import Link from "next/link";
import {ChevronLeft, ChevronRight, Search, Users} from "lucide-react";

import {buttonClass} from "@/components/ui/button";
import {Badge, Card, EmptyState, PageHeader} from "@/components/ui/card";
import {requireStaffPage} from "@/lib/auth/guards";
import {countRegistrationsByStatus, listRegistrations, REGISTRATION_STATUSES, REGISTRATION_TYPES, type RegistrationStatus} from "@/lib/data/registrations";
import {formatDateTime, formatNumber} from "@/lib/i18n/core";
import {getI18n} from "@/lib/i18n/server";
import {cn} from "@/lib/utils/cn";
import {STATUS_TONE} from "@/components/staff/admin/registration-status";

const PAGE_SIZE = 25;

/** Registration Management: every online application, filterable by status and type. */
export default async function RegistrationsPage({searchParams}: PageProps<"/staff/registrations">) {
  await requireStaffPage(["admin"]);
  const {t, locale} = await getI18n();
  const params = await searchParams;
  const status = ([...REGISTRATION_STATUSES, "all"] as const).find((item) => item === params.status) ?? "pending";
  const type = REGISTRATION_TYPES.find((item) => item === params.type) ?? "all";
  const query = typeof params.q === "string" ? params.q : "";
  const page = Math.max(1, Number(params.page) || 1);
  const counts = await countRegistrationsByStatus();
  const {registrations, total} = await listRegistrations({status, type, query, limit: PAGE_SIZE, offset: (page - 1) * PAGE_SIZE});
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const href = (patch: Record<string, string | number>) => {
    const next = {...(status !== "pending" ? {status} : {}), ...(type !== "all" ? {type} : {}), ...(query ? {q: query} : {}), ...patch};
    return `?${new URLSearchParams(Object.entries(next).map(([key, value]) => [key, String(value)]))}`;
  };
  const n = (value: number) => formatNumber(locale, value);

  return (
    <div>
      <PageHeader eyebrow={t("staff.sections.manage")} title={t("staff.registrations.title")} description={t("staff.registrations.lede")} />

      {/* Status tabs with counts */}
      <nav className="-mx-4 mb-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-wrap sm:px-0" aria-label={t("staff.registrations.status")}>
        {([...REGISTRATION_STATUSES, "all"] as const).map((item) => (
          <Link
            key={item}
            href={href({status: item, page: 1})}
            aria-current={item === status ? "page" : undefined}
            className={cn(
              "inline-flex h-10 shrink-0 items-center gap-2 rounded-full px-4 text-sm font-semibold ring-1 transition",
              item === status ? "bg-ink text-white ring-ink" : "bg-card text-ink-soft ring-line hover:ring-ink/30",
            )}
          >
            {t(`staff.registrations.statuses.${item}`)}
            {item !== "all" ? (
              <span className={cn("tabular rounded-full px-2 py-0.5 text-xs", item === status ? "bg-white/15" : item === "pending" && counts.pending ? "bg-crimson text-white" : "bg-paper-deep")}>
                {n(counts[item as RegistrationStatus])}
              </span>
            ) : null}
          </Link>
        ))}
      </nav>

      <Card className="p-0 sm:p-0">
        <form className="grid grid-cols-[1fr_auto] gap-2 border-b border-line p-4 sm:flex sm:flex-wrap sm:p-5" role="search">
          {status !== "pending" ? <input type="hidden" name="status" value={status} /> : null}
          <div className="relative col-span-2 min-w-0 sm:min-w-56 sm:flex-1">
            <Search className="pointer-events-none absolute start-3.5 top-1/2 size-4 -translate-y-1/2 text-muted" aria-hidden />
            <input
              name="q"
              type="search"
              defaultValue={query}
              placeholder={t("staff.registrations.searchPlaceholder")}
              aria-label={t("common.search")}
              className="h-11 w-full rounded-xl bg-card ps-10 pe-3 text-base ring-1 ring-line-strong focus:ring-2 focus:ring-crimson focus:outline-none sm:text-sm"
            />
          </div>
          <select name="type" defaultValue={type} aria-label={t("staff.registrations.type")} className="h-11 min-w-0 rounded-xl bg-card px-3 ring-1 ring-line-strong focus:ring-2 focus:ring-crimson focus:outline-none">
            <option value="all">{t("staff.registrations.allTypes")}</option>
            {REGISTRATION_TYPES.map((item) => (
              <option key={item} value={item}>
                {t(`register.types.${item}.title`)}
              </option>
            ))}
          </select>
          <button type="submit" className={buttonClass("dark")}>
            {t("common.search")}
          </button>
        </form>

        {registrations.length ? (
          <>
            {/* Phones: one card per application */}
            <ul className="divide-y divide-line md:hidden">
              {registrations.map((item) => (
                <li key={item.id}>
                  <Link href={`/staff/registrations/${item.id}`} className="flex items-center gap-3 px-4 py-3.5 active:bg-paper">
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-semibold" dir="auto">{item.fullName}</p>
                      <p className="truncate text-sm text-ink-soft" dir="ltr">
                        <span className="block text-start rtl:text-end">{item.email ?? item.phone}</span>
                      </p>
                      <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                        <Badge tone="neutral">{t(`register.types.${item.type}.title`)}</Badge>
                        <Badge tone={STATUS_TONE[item.status]}>{t(`staff.registrations.statuses.${item.status}`)}</Badge>
                        {item.isFamily ? <Badge tone="crimson">{t("staff.registrations.familyOf", {count: n(item.memberCount + 1)})}</Badge> : null}
                      </div>
                    </div>
                    <ChevronLeft className="size-4 shrink-0 text-muted ltr:rotate-180" aria-hidden />
                  </Link>
                </li>
              ))}
            </ul>

            <div className="hidden overflow-x-auto md:block">
              <table className="w-full min-w-[48rem] text-sm">
                <thead>
                  <tr className="border-b border-line text-xs font-semibold text-muted">
                    <th className="px-5 py-3 text-start">{t("staff.registrations.applicant")}</th>
                    <th className="px-3 py-3 text-start">{t("staff.registrations.type")}</th>
                    <th className="px-3 py-3 text-start">{t("staff.registrations.contact")}</th>
                    <th className="px-3 py-3 text-start">{t("staff.registrations.submitted")}</th>
                    <th className="px-5 py-3 text-start">{t("staff.registrations.status")}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {registrations.map((item) => (
                    <tr key={item.id} className="transition hover:bg-paper">
                      <td className="px-5 py-3">
                        <Link href={`/staff/registrations/${item.id}`} className="group block">
                          <span className="font-semibold text-ink group-hover:text-crimson group-hover:underline" dir="auto">{item.fullName}</span>
                          {item.isFamily ? (
                            <span className="mt-0.5 flex items-center gap-1 text-xs text-muted">
                              <Users className="size-3.5" aria-hidden />
                              {t("staff.registrations.familyOf", {count: n(item.memberCount + 1)})}
                            </span>
                          ) : null}
                        </Link>
                      </td>
                      <td className="px-3 py-3">
                        <Badge tone="neutral">{t(`register.types.${item.type}.title`)}</Badge>
                      </td>
                      <td className="px-3 py-3 text-ink-soft" dir="ltr">
                        {item.email ? <span className="block text-start rtl:text-end">{item.email}</span> : null}
                        {item.phone ? <span className="block text-start text-xs text-muted rtl:text-end">{item.phone}</span> : null}
                      </td>
                      <td className="px-3 py-3 text-muted">{formatDateTime(locale, item.createdAt)}</td>
                      <td className="px-5 py-3">
                        <Badge tone={STATUS_TONE[item.status]}>{t(`staff.registrations.statuses.${item.status}`)}</Badge>
                        {item.guestCode ? <span className="ms-2 font-mono text-xs text-muted" dir="ltr">{item.guestCode}</span> : null}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        ) : (
          <div className="p-5">
            <EmptyState title={t("staff.registrations.empty")} />
          </div>
        )}

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line px-4 py-3 text-sm text-muted sm:px-5">
          <span>{t("common.showing", {count: n(registrations.length), total: n(total)})}</span>
          {pages > 1 ? (
            <div className="flex items-center gap-2">
              <span>{t("common.pageOf", {page: n(page), pages: n(pages)})}</span>
              <Link href={href({page: page - 1})} aria-disabled={page <= 1} className={cn(buttonClass("secondary", "sm", "size-11 px-0 sm:size-9"), page <= 1 && "pointer-events-none opacity-40")} aria-label={t("common.previous")}>
                <ChevronLeft className="size-4 rtl:-scale-x-100" />
              </Link>
              <Link href={href({page: page + 1})} aria-disabled={page >= pages} className={cn(buttonClass("secondary", "sm", "size-11 px-0 sm:size-9"), page >= pages && "pointer-events-none opacity-40")} aria-label={t("common.next")}>
                <ChevronRight className="size-4 rtl:-scale-x-100" />
              </Link>
            </div>
          ) : null}
        </div>
      </Card>
    </div>
  );
}
