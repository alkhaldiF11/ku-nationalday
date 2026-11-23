import {ChevronDown, Crown, UserRound} from "lucide-react";

import {Card, CardHeader} from "@/components/ui/card";
import type {Guest} from "@/lib/data/guests";
import {formatNumber} from "@/lib/i18n/core";
import {getI18n} from "@/lib/i18n/server";

/**
 * The account holder's family. The holder's row is always shown; the children sit behind a
 * show/hide button (a native <details>, so it works without JavaScript and with screen readers).
 */
export async function FamilyCard({members}: {members: Guest[]}) {
  const {t, locale} = await getI18n();
  const holder = members.find((member) => member.isAccountHolder) ?? members[0];
  const children = members.filter((member) => member.id !== holder.id);

  return (
    <Card>
      <CardHeader title={t("guest.family.title")} description={t("guest.family.lede")} />
      <div className="overflow-hidden rounded-2xl ring-1 ring-line">
        <MemberRow member={holder} label={t("guest.family.holder")} holder />
        {children.length ? (
          <details className="group border-t border-line">
            <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between gap-3 bg-paper px-4 py-2.5 text-sm font-semibold text-ink-soft select-none hover:bg-paper-deep [&::-webkit-details-marker]:hidden">
              <span className="group-open:hidden">{t("guest.family.showChildren", {count: formatNumber(locale, children.length)})}</span>
              <span className="hidden group-open:inline">{t("guest.family.hideChildren")}</span>
              <ChevronDown className="size-4 shrink-0 transition group-open:rotate-180" aria-hidden />
            </summary>
            <ul className="divide-y divide-line border-t border-line">
              {children.map((member) => (
                <li key={member.id}>
                  <MemberRow member={member} label={t("guest.family.child")} />
                </li>
              ))}
            </ul>
          </details>
        ) : null}
      </div>
    </Card>
  );
}

function MemberRow({member, label, holder}: {member: Guest; label: string; holder?: boolean}) {
  return (
    <div className="flex items-center gap-3 px-4 py-3">
      {holder ? <Crown className="size-5 shrink-0 text-gold" aria-hidden /> : <UserRound className="size-5 shrink-0 text-muted" aria-hidden />}
      <div className="min-w-0 flex-1">
        {/* <bdi> keeps a Latin name in its own direction without pulling the row's alignment. */}
        <p className="truncate font-semibold">
          <bdi>{member.fullName}</bdi>
        </p>
        <p className="text-xs text-muted">{label}</p>
      </div>
      <span className="shrink-0 rounded-lg bg-paper-deep px-2.5 py-1 font-mono text-sm font-semibold" dir="ltr">
        {member.code}
      </span>
    </div>
  );
}
