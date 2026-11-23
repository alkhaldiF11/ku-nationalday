import Link from "next/link";
import {ChevronLeft, ChevronRight} from "lucide-react";

import {buttonClass} from "@/components/ui/button";
import {Badge, Card, EmptyState, PageHeader} from "@/components/ui/card";
import {requireStaffPage} from "@/lib/auth/guards";
import {listAudit, listAuditActions} from "@/lib/data/audit";
import {formatDateTime, formatNumber} from "@/lib/i18n/core";
import {getI18n} from "@/lib/i18n/server";
import {cn} from "@/lib/utils/cn";

const PAGE_SIZE = 40;

export default async function ActivityPage({searchParams}: PageProps<"/staff/activity">) {
  await requireStaffPage(["admin"]);
  const {t, locale} = await getI18n();
  const params = await searchParams;
  const actions = await listAuditActions();
  const action = typeof params.action === "string" && actions.includes(params.action) ? params.action : undefined;
  const page = Math.max(1, Number(params.page) || 1);
  const {entries, total} = await listAudit({action, limit: PAGE_SIZE, offset: (page - 1) * PAGE_SIZE});
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const href = (nextPage: number) => `/staff/activity?${new URLSearchParams({...(action ? {action} : {}), page: String(nextPage)})}`;

  return (
    <div>
      <PageHeader eyebrow={t("staff.sections.system")} title={t("staff.activity.title")} description={t("staff.activity.lede")} />
      <Card className="p-0 sm:p-0">
        <form className="flex flex-wrap gap-2 border-b border-line p-4 sm:p-5">
          <select name="action" defaultValue={action ?? ""} aria-label={t("common.filter")} className="h-11 min-w-56 rounded-xl bg-card px-3 ring-1 ring-line-strong focus:ring-2 focus:ring-crimson focus:outline-none">
            <option value="">{t("staff.activity.allActions")}</option>
            {actions.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
          <button type="submit" className={buttonClass("dark")}>
            {t("common.filter")}
          </button>
        </form>
        {entries.length ? (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[44rem] text-sm">
              <thead>
                <tr className="border-b border-line text-xs font-semibold text-muted">
                  <th className="px-5 py-3 text-start">{t("staff.activity.when")}</th>
                  <th className="px-3 py-3 text-start">{t("staff.activity.who")}</th>
                  <th className="px-3 py-3 text-start">{t("staff.activity.action")}</th>
                  <th className="px-5 py-3 text-start">{t("staff.activity.details")}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {entries.map((entry) => (
                  <tr key={entry.id}>
                    <td className="px-5 py-2.5 whitespace-nowrap text-muted">{formatDateTime(locale, entry.createdAt)}</td>
                    <td className="px-3 py-2.5 font-semibold">{entry.actorName}</td>
                    <td className="px-3 py-2.5">
                      <Badge tone={entry.action.endsWith("deleted") || entry.action.endsWith("deactivated") ? "danger" : "neutral"}>
                        <code>{entry.action}</code>
                      </Badge>
                    </td>
                    <td className="px-5 py-2.5 text-ink-soft">{entry.details}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-5">
            <EmptyState title={t("staff.activity.empty")} />
          </div>
        )}
        <div className="flex items-center justify-between gap-3 border-t border-line px-5 py-3 text-sm text-muted">
          <span>{t("common.showing", {count: formatNumber(locale, entries.length), total: formatNumber(locale, total)})}</span>
          {pages > 1 ? (
            <div className="flex items-center gap-2">
              <span>{t("common.pageOf", {page: formatNumber(locale, page), pages: formatNumber(locale, pages)})}</span>
              <Link href={href(page - 1)} className={cn(buttonClass("secondary", "sm"), page <= 1 && "pointer-events-none opacity-40")} aria-label={t("common.previous")}>
                <ChevronLeft className="size-4 rtl:-scale-x-100" />
              </Link>
              <Link href={href(page + 1)} className={cn(buttonClass("secondary", "sm"), page >= pages && "pointer-events-none opacity-40")} aria-label={t("common.next")}>
                <ChevronRight className="size-4 rtl:-scale-x-100" />
              </Link>
            </div>
          ) : null}
        </div>
      </Card>
    </div>
  );
}
