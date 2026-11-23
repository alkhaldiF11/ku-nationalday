import {SettingsForm} from "@/components/staff/admin/system-admin";
import {Card, PageHeader} from "@/components/ui/card";
import {requireStaffPage} from "@/lib/auth/guards";
import {getSettings} from "@/lib/data/content";
import {getI18n} from "@/lib/i18n/server";

export default async function SettingsPage() {
  await requireStaffPage(["admin"]);
  const {t} = await getI18n();
  return (
    <div className="max-w-3xl">
      <PageHeader eyebrow={t("staff.sections.system")} title={t("staff.settings.title")} description={t("staff.settings.lede")} />
      <Card>
        <SettingsForm settings={await getSettings()} />
      </Card>
    </div>
  );
}
