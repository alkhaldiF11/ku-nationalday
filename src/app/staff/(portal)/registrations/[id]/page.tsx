import Link from "next/link";
import {notFound} from "next/navigation";
import {ArrowLeft, Crown, UserRound} from "lucide-react";

import {RegistrationDecision} from "@/components/staff/admin/registration-review";
import {Badge, Card, CardHeader, PageHeader} from "@/components/ui/card";
import {requireStaffPage} from "@/lib/auth/guards";
import {getRegistration} from "@/lib/data/registrations";
import {formatDateTime} from "@/lib/i18n/core";
import {getI18n} from "@/lib/i18n/server";

import {STATUS_TONE} from "@/components/staff/admin/registration-status";

/** One application: every detail, the family members, and the decision. */
export default async function RegistrationDetailPage({params}: PageProps<"/staff/registrations/[id]">) {
  await requireStaffPage(["admin"]);
  const {t, locale} = await getI18n();
  const {id} = await params;
  const reg = await getRegistration(id);
  if (!reg) notFound();

  const rows: Array<[string, string | null, boolean?]> = [
    [t("staff.registrations.email"), reg.email, true],
    [t("staff.registrations.phone"), reg.phone, true],
    [t("staff.registrations.studentId"), reg.studentId, true],
    [t("staff.registrations.jobTitle"), reg.jobTitle],
    [t("staff.registrations.submitted"), formatDateTime(locale, reg.createdAt)],
  ];

  return (
    <div className="max-w-3xl">
      <Link href="/staff/registrations" className="mb-3 inline-flex min-h-11 items-center gap-1.5 text-sm font-semibold text-ink-soft hover:text-ink">
        <ArrowLeft className="size-4 rtl:-scale-x-100" aria-hidden />
        {t("staff.registrations.back")}
      </Link>
      <PageHeader eyebrow={t("staff.registrations.detailTitle")} title={<span dir="auto">{reg.fullName}</span>} />

      <div className="space-y-4">
        <Card>
          <div className="mb-4 flex flex-wrap items-center gap-2">
            <Badge tone="neutral">{t(`register.types.${reg.type}.title`)}</Badge>
            <Badge tone={STATUS_TONE[reg.status]}>{t(`staff.registrations.statuses.${reg.status}`)}</Badge>
            {reg.isFamily ? <Badge tone="crimson">{t("staff.registrations.familyOf", {count: reg.memberCount + 1})}</Badge> : null}
          </div>
          <dl className="grid gap-x-6 gap-y-3 sm:grid-cols-2">
            {rows
              .filter(([, value]) => value)
              .map(([label, value, ltr]) => (
                <div key={label} className="min-w-0">
                  <dt className="text-xs font-semibold text-muted">{label}</dt>
                  <dd className="font-semibold break-words" dir={ltr ? "ltr" : undefined}>
                    <span className={ltr ? "block text-start rtl:text-end" : undefined}>{value}</span>
                  </dd>
                </div>
              ))}
          </dl>
          {reg.reviewedAt ? (
            <p className="mt-4 border-t border-line pt-3 text-sm text-muted">
              {t("staff.registrations.reviewed", {name: reg.reviewedByName ?? "—", date: formatDateTime(locale, reg.reviewedAt)})}
              {reg.rejectionReason ? <span className="mt-1 block text-ink-soft">{t("staff.registrations.reasonShown", {reason: reg.rejectionReason})}</span> : null}
            </p>
          ) : null}
        </Card>

        {/* Everyone on the application and their Guest IDs (assigned on approval). */}
        <Card>
          <CardHeader title={reg.isFamily ? t("staff.registrations.members") : t("staff.registrations.guestId")} />
          <ul className="divide-y divide-line rounded-2xl ring-1 ring-line">
            <li className="flex items-center gap-3 px-4 py-3">
              <Crown className="size-5 shrink-0 text-gold" aria-hidden />
              <div className="min-w-0 flex-1">
                <p className="truncate font-semibold" dir="auto">{reg.fullName}</p>
                <p className="text-xs text-muted">{t("staff.registrations.holder")}</p>
              </div>
              <GuestCode code={reg.guestCode} pendingLabel={t("staff.registrations.afterApproval")} href={reg.guestId ? `/staff/guests/${reg.guestId}` : null} />
            </li>
            {reg.members.map((member) => (
              <li key={member.id} className="flex items-center gap-3 px-4 py-3">
                <UserRound className="size-5 shrink-0 text-muted" aria-hidden />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold" dir="auto">{member.fullName}</p>
                  <p className="text-xs text-muted">{t("staff.registrations.childLabel")}</p>
                </div>
                <GuestCode code={member.guestCode} pendingLabel={t("staff.registrations.afterApproval")} href={null} />
              </li>
            ))}
          </ul>
        </Card>

        {reg.status === "pending" ? <RegistrationDecision id={reg.id} name={reg.fullName} people={reg.memberCount + 1} /> : null}
      </div>
    </div>
  );
}

function GuestCode({code, pendingLabel, href}: {code: string | null; pendingLabel: string; href: string | null}) {
  if (!code) return <span className="shrink-0 text-xs text-muted">{pendingLabel}</span>;
  const label = (
    <span className="shrink-0 rounded-lg bg-paper-deep px-2.5 py-1 font-mono text-sm font-semibold" dir="ltr">
      {code}
    </span>
  );
  return href ? <Link href={href}>{label}</Link> : label;
}
