import {AddStaffButton, EditStaffButton, SetStaffPasswordButton} from "@/components/staff/admin/system-admin";
import {Badge, Card, PageHeader} from "@/components/ui/card";
import {requireStaffPage} from "@/lib/auth/guards";
import {listStaff} from "@/lib/data/staff";
import {getI18n} from "@/lib/i18n/server";
import {cn} from "@/lib/utils/cn";

export default async function TeamPage() {
  const me = await requireStaffPage(["admin"]);
  const {t} = await getI18n();
  const staff = await listStaff();

  return (
    <div className="max-w-4xl">
      <PageHeader eyebrow={t("staff.sections.system")} title={t("staff.team.title")} description={t("staff.team.lede")} action={<AddStaffButton />} />
      <Card className="divide-y divide-line p-0 sm:p-0">
        {staff.map((member) => (
          <div key={member.id} className={cn("flex items-center gap-3 px-4 py-3.5 sm:gap-4 sm:px-5 sm:py-4", !member.isActive && "opacity-60")}>
            <span className="grid size-10 shrink-0 place-items-center rounded-full bg-paper-deep font-bold text-ink-soft" aria-hidden>
              {member.fullName.slice(0, 1)}
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate font-semibold" dir="auto">{member.fullName}</p>
              <p className="truncate font-mono text-xs text-muted" dir="ltr">
                <span className="block text-start rtl:text-end">{member.username}</span>
              </p>
              {/* Role and status on their own line, so they never collide with a long name. */}
              <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                <Badge tone={member.role === "admin" ? "crimson" : "neutral"}>{t(`staff.roles.${member.role}`)}</Badge>
                {member.id === me.id ? <Badge tone="dark">{t("staff.team.you")}</Badge> : null}
                {!member.isActive ? <Badge tone="danger">{t("common.inactive")}</Badge> : null}
              </div>
            </div>
            <div className="flex shrink-0">
              <SetStaffPasswordButton member={member} />
              <EditStaffButton member={member} />
            </div>
          </div>
        ))}
      </Card>
    </div>
  );
}
